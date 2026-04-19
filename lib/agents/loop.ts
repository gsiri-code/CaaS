import { randomUUID } from "node:crypto";
import { anthropic, CLAUDE_MODEL } from "@/lib/clients/anthropic";
import { NEGOTIATION_TOOLS, type ToolInput } from "./tools";
import {
  requesterSystemPrompt,
  ownerSystemPrompt,
  type GarmentContext,
  type CalendarEventContext,
} from "./prompts";
import { emitNegotiation, createNegotiationBus } from "./events";
import type Anthropic from "@anthropic-ai/sdk";

const MAX_TURNS = 8;

export type NegotiationParticipant = {
  userId: string;
  userName: string;
  role: "requester" | "owner";
};

export type NegotiationSetup = {
  negotiationId: string;
  garment: GarmentContext;
  requester: NegotiationParticipant;
  owner: NegotiationParticipant;
  sharedEvents: CalendarEventContext[];
  /** Callback to persist a message */
  persistMessage: (msg: {
    negotiationId: string;
    speaker: string;
    content: string;
    toolCall: { name: string; result?: string } | null;
  }) => Promise<{ id: string }>;
  /** Callback to update negotiation status */
  persistStatus: (update: {
    negotiationId: string;
    status: string;
    turnCount: number;
    agreedPriceUsd?: number;
    agreedHandoff?: {
      type: "calendar_event" | "shipping";
      datetime?: string;
      location?: string;
    };
  }) => Promise<void>;
};

type ConversationMessage = Anthropic.MessageParam;

export async function runNegotiationLoop(setup: NegotiationSetup) {
  const { negotiationId, garment, requester, owner, sharedEvents } = setup;

  createNegotiationBus(negotiationId);

  const requesterMessages: ConversationMessage[] = [];
  const ownerMessages: ConversationMessage[] = [];

  let turnCount = 0;
  let lastProposal: {
    price_usd_per_day: number;
    duration_days: number;
    handoff_method: string;
    handoff_location: string;
  } | null = null;
  let terminated = false;

  try {
    while (turnCount < MAX_TURNS && !terminated) {
      turnCount++;
      emitNegotiation(negotiationId, {
        type: "turn",
        negotiationId,
        turnCount,
      });

      // --- Requester's turn ---
      const requesterCtx = {
        userName: requester.userName,
        otherUserName: owner.userName,
        garment,
        sharedEvents,
        maxTurns: MAX_TURNS,
        currentTurn: turnCount,
      };

      const requesterResult = await runAgentTurn(
        requesterSystemPrompt(requesterCtx),
        requesterMessages,
        `${requester.userName}'s agent`,
      );

      const reqMsg = await persistAndEmit(
        setup,
        requester.userName.toLowerCase(),
        requesterResult.textContent,
        requesterResult.toolUse,
      );

      // Feed requester's message into owner's conversation as context
      if (reqMsg) {
        ownerMessages.push({
          role: "user",
          content: formatAgentMessage(requester.userName, requesterResult),
        });
      }

      // Process requester tool call
      const reqAction = processToolCall(requesterResult.toolUse);
      if (reqAction) {
        if (reqAction.type === "accept") {
          lastProposal = lastProposal ?? {
            price_usd_per_day: 0,
            duration_days: 2,
            handoff_method: "shipping",
            handoff_location: "TBD",
          };
          await finalizeNegotiation(setup, "pending_approval", turnCount, lastProposal);
          terminated = true;
          break;
        }
        if (reqAction.type === "reject") {
          await finalizeNegotiation(setup, "rejected", turnCount, null);
          terminated = true;
          break;
        }
        if (reqAction.type === "proposal") {
          lastProposal = reqAction.terms;
        }
      }

      // Add the tool result to requester's history
      if (requesterResult.toolUse) {
        requesterMessages.push({
          role: "assistant",
          content: requesterResult.rawContent,
        });
        requesterMessages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: requesterResult.toolUse.id,
              content: "Proposal sent to the other party.",
            },
          ],
        });
      }

      if (terminated) break;

      // --- Owner's turn ---
      turnCount++;
      emitNegotiation(negotiationId, {
        type: "turn",
        negotiationId,
        turnCount,
      });

      const ownerCtx = {
        userName: owner.userName,
        otherUserName: requester.userName,
        garment,
        sharedEvents,
        maxTurns: MAX_TURNS,
        currentTurn: turnCount,
      };

      const ownerResult = await runAgentTurn(
        ownerSystemPrompt(ownerCtx),
        ownerMessages,
        `${owner.userName}'s agent`,
      );

      await persistAndEmit(
        setup,
        owner.userName.toLowerCase(),
        ownerResult.textContent,
        ownerResult.toolUse,
      );

      // Feed owner's message into requester's conversation
      requesterMessages.push({
        role: "user",
        content: formatAgentMessage(owner.userName, ownerResult),
      });

      // Process owner tool call
      const ownerAction = processToolCall(ownerResult.toolUse);
      if (ownerAction) {
        if (ownerAction.type === "accept") {
          lastProposal = lastProposal ?? {
            price_usd_per_day: 0,
            duration_days: 2,
            handoff_method: "shipping",
            handoff_location: "TBD",
          };
          await finalizeNegotiation(setup, "pending_approval", turnCount, lastProposal);
          terminated = true;
          break;
        }
        if (ownerAction.type === "reject") {
          await finalizeNegotiation(setup, "rejected", turnCount, null);
          terminated = true;
          break;
        }
        if (ownerAction.type === "proposal") {
          lastProposal = ownerAction.terms;
        }
      }

      // Add tool result to owner's history
      if (ownerResult.toolUse) {
        ownerMessages.push({
          role: "assistant",
          content: ownerResult.rawContent,
        });
        ownerMessages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: ownerResult.toolUse.id,
              content: "Proposal sent to the other party.",
            },
          ],
        });
      }

      // Update turn count in DB
      await setup.persistStatus({
        negotiationId,
        status: "open",
        turnCount,
      });
    }

    // If we hit max turns without resolution, expire
    if (!terminated) {
      await finalizeNegotiation(setup, "expired", turnCount, null);
    }

    emitNegotiation(negotiationId, { type: "done", negotiationId });
  } catch (err) {
    console.error(`[negotiation ${negotiationId}] fatal:`, err);
    emitNegotiation(negotiationId, {
      type: "error",
      negotiationId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

type AgentTurnResult = {
  textContent: string;
  toolUse: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  } | null;
  rawContent: Anthropic.ContentBlock[];
};

async function runAgentTurn(
  systemPrompt: string,
  messages: ConversationMessage[],
  _agentLabel: string,
): Promise<AgentTurnResult> {
  const response = await anthropic().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    tools: NEGOTIATION_TOOLS,
    messages:
      messages.length === 0
        ? [{ role: "user", content: "Begin the negotiation. Make your opening proposal." }]
        : messages,
  });

  let textContent = "";
  let toolUse: AgentTurnResult["toolUse"] = null;

  for (const block of response.content) {
    if (block.type === "text") {
      textContent += block.text;
    } else if (block.type === "tool_use") {
      toolUse = {
        id: block.id,
        name: block.name,
        input: block.input as Record<string, unknown>,
      };
    }
  }

  return { textContent, toolUse, rawContent: response.content };
}

function formatAgentMessage(
  speakerName: string,
  result: AgentTurnResult,
): string {
  let msg = `[${speakerName}'s agent says]: ${result.textContent}`;
  if (result.toolUse) {
    msg += `\n[Tool call: ${result.toolUse.name}(${JSON.stringify(result.toolUse.input)})]`;
  }
  return msg;
}

type ToolAction =
  | {
      type: "proposal";
      terms: {
        price_usd_per_day: number;
        duration_days: number;
        handoff_method: string;
        handoff_location: string;
      };
    }
  | { type: "accept" }
  | { type: "reject" };

function processToolCall(
  toolUse: AgentTurnResult["toolUse"],
): ToolAction | null {
  if (!toolUse) return null;

  const input = toolUse.input as ToolInput["input"];

  switch (toolUse.name) {
    case "propose_deal":
    case "counter_offer": {
      const terms = input as {
        price_usd_per_day: number;
        duration_days: number;
        handoff_method: string;
        handoff_location: string;
      };
      return { type: "proposal", terms };
    }
    case "accept_deal":
      return { type: "accept" };
    case "reject_deal":
      return { type: "reject" };
    default:
      return null;
  }
}

async function persistAndEmit(
  setup: NegotiationSetup,
  speaker: string,
  content: string,
  toolUse: AgentTurnResult["toolUse"],
) {
  const toolCall = toolUse
    ? {
        name: toolUse.name,
        result: JSON.stringify(toolUse.input),
      }
    : null;

  const displayContent =
    content || (toolUse ? `[${toolUse.name.replace(/_/g, " ")}]` : "");

  const { id } = await setup.persistMessage({
    negotiationId: setup.negotiationId,
    speaker,
    content: displayContent,
    toolCall,
  });

  emitNegotiation(setup.negotiationId, {
    type: "message",
    negotiationId: setup.negotiationId,
    message: {
      id,
      speaker,
      content: displayContent,
      toolCall,
      createdAt: new Date().toISOString(),
    },
  });

  return { id };
}

async function finalizeNegotiation(
  setup: NegotiationSetup,
  status: string,
  turnCount: number,
  terms: {
    price_usd_per_day: number;
    duration_days: number;
    handoff_method: string;
    handoff_location: string;
  } | null,
) {
  const agreedPriceUsd =
    status === "accepted" && terms ? terms.price_usd_per_day : undefined;
  const agreedHandoff =
    status === "accepted" && terms
      ? {
          type: (terms.handoff_method === "in_person"
            ? "calendar_event"
            : "shipping") as "calendar_event" | "shipping",
          datetime: new Date(
            Date.now() + 2 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          location: terms.handoff_location,
        }
      : undefined;

  await setup.persistStatus({
    negotiationId: setup.negotiationId,
    status,
    turnCount,
    agreedPriceUsd,
    agreedHandoff,
  });

  emitNegotiation(setup.negotiationId, {
    type: "status_change",
    negotiationId: setup.negotiationId,
    status,
    agreedPriceUsd: agreedPriceUsd ?? null,
    agreedHandoff: agreedHandoff ?? null,
  });
}
