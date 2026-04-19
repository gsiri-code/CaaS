import type Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { garments, rentalNegotiations, negotiationMessages } from "@/db/schema";
import { anthropic, CLAUDE_MODEL } from "@/lib/clients/anthropic";
import { emitNeg, createNegBus } from "./events";
import {
  toolSpecs,
  ACTION_TOOLS,
  runInfoTool,
  validateActionTool,
  type ToolContext,
} from "./tools";
import {
  requesterSystemPrompt,
  ownerSystemPrompt,
  type AgentContext,
  type GarmentBrief,
} from "./prompts";

export const MAX_TURNS = 8;
export const MAX_INFO_STEPS_PER_TURN = 4; // cap tool chatter inside a single turn
const MAX_OUTPUT_TOKENS = 1024;

type Role = "requester_agent" | "owner_agent";

type ChatMessage = Anthropic.MessageParam;

type NegotiationState = {
  id: string;
  requesterId: string;
  ownerId: string;
  garment: GarmentBrief;
  maxPriceUsd?: number;
};

export async function startNegotiation(input: {
  negotiationId: string;
  requesterId: string;
  requesterName: string;
  ownerId: string;
  ownerName: string;
  garmentId: string;
  maxPriceUsd?: number;
}) {
  createNegBus(input.negotiationId);

  const [g] = await db.select().from(garments).where(eq(garments.id, input.garmentId));
  if (!g) {
    emitNeg(input.negotiationId, {
      type: "negotiation_error",
      negotiationId: input.negotiationId,
      error: "garment not found",
    });
    return;
  }
  if (g.vault) {
    emitNeg(input.negotiationId, {
      type: "negotiation_error",
      negotiationId: input.negotiationId,
      error: "garment is vaulted",
    });
    return;
  }

  const state: NegotiationState = {
    id: input.negotiationId,
    requesterId: input.requesterId,
    ownerId: input.ownerId,
    garment: {
      id: g.id,
      category: g.category,
      subcategory: g.subcategory,
      colorPrimary: g.colorPrimary,
      pattern: g.pattern,
      brandGuess: g.brandGuess,
      description: g.description,
      estimatedValueUsd: g.estimatedValueUsd,
    },
    maxPriceUsd: input.maxPriceUsd,
  };

  const requesterCtx: AgentContext = {
    myUserName: input.requesterName,
    otherUserName: input.ownerName,
    garment: state.garment,
    negotiatedGarmentId: g.id,
    maxPriceUsd: input.maxPriceUsd,
    maxTurns: MAX_TURNS,
  };
  const ownerCtx: AgentContext = {
    myUserName: input.ownerName,
    otherUserName: input.requesterName,
    garment: state.garment,
    negotiatedGarmentId: g.id,
    maxTurns: MAX_TURNS,
  };

  const requesterPrompt = requesterSystemPrompt(requesterCtx);
  const ownerPrompt = ownerSystemPrompt(ownerCtx);

  const transcript: { speaker: Role; content: string; toolCall: unknown | null }[] = [];

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    const speaker: Role = turn % 2 === 1 ? "requester_agent" : "owner_agent";
    const systemPrompt = speaker === "requester_agent" ? requesterPrompt : ownerPrompt;
    const myUserId = speaker === "requester_agent" ? state.requesterId : state.ownerId;
    const otherUserId = speaker === "requester_agent" ? state.ownerId : state.requesterId;

    const ctx: ToolContext = {
      myUserId,
      otherUserId,
      negotiatedGarmentId: state.garment.id,
    };

    try {
      const result = await runOneTurn({
        speaker,
        systemPrompt,
        transcript,
        ctx,
        isFirstRequesterTurn: turn === 1,
      });

      transcript.push({ speaker, content: result.content, toolCall: result.actionCall });
      await persistMessage(state.id, turn, speaker, result.content, result.actionCall);
      emitNeg(state.id, {
        type: "message",
        speaker,
        content: result.content,
        toolCall: result.actionCall,
        turn,
      });

      if (!result.actionCall) {
        // Agent failed to produce an action; treat as implicit reject to stay within turn cap.
        await closeNegotiation(state.id, "rejected", `${speaker} produced no action`);
        emitNeg(state.id, {
          type: "negotiation_rejected",
          negotiationId: state.id,
          reasoning: `${speaker} produced no action`,
        });
        return;
      }

      const tool = result.actionCall.name;
      if (tool === "accept") {
        const lastProposal = latestProposal(transcript);
        if (lastProposal) {
          await db
            .update(rentalNegotiations)
            .set({
              status: "accepted",
              agreedPriceUsd: lastProposal.priceUsd,
              agreedHandoff: normalizeHandoff(lastProposal.handoff),
              turnCount: turn,
              closedAt: new Date(),
            })
            .where(eq(rentalNegotiations.id, state.id));
          emitNeg(state.id, {
            type: "deal_proposed",
            negotiationId: state.id,
            garmentId: state.garment.id,
            priceUsd: lastProposal.priceUsd,
            durationDays: lastProposal.durationDays ?? 1,
            handoff: lastProposal.handoff,
          });
        } else {
          await closeNegotiation(state.id, "rejected", "accept without prior offer");
          emitNeg(state.id, {
            type: "negotiation_rejected",
            negotiationId: state.id,
            reasoning: "accept called with no prior offer on the table",
          });
          return;
        }
        emitNeg(state.id, { type: "negotiation_accepted", negotiationId: state.id });
        return;
      }

      if (tool === "reject") {
        const reasoning =
          (result.actionCall.input as { reasoning?: string })?.reasoning ?? "rejected";
        await closeNegotiation(state.id, "rejected", reasoning);
        emitNeg(state.id, {
          type: "negotiation_rejected",
          negotiationId: state.id,
          reasoning,
        });
        return;
      }

      if (tool === "propose_rental" || tool === "counter_offer") {
        const input = result.actionCall.input as Record<string, unknown>;
        const price = tool === "propose_rental"
          ? Number(input.price_usd)
          : typeof input.price_usd === "number"
            ? input.price_usd
            : latestProposal(transcript)?.priceUsd;
        const duration = tool === "propose_rental"
          ? Number(input.duration_days)
          : typeof input.duration_days === "number"
            ? input.duration_days
            : latestProposal(transcript)?.durationDays;
        const handoff = (input.handoff as { type?: string; datetime?: string; location?: string }) ??
          latestProposal(transcript)?.handoff ?? { type: "shipping" };

        if (typeof price === "number" && typeof duration === "number") {
          emitNeg(state.id, {
            type: "deal_proposed",
            negotiationId: state.id,
            garmentId: state.garment.id,
            priceUsd: price,
            durationDays: duration,
            handoff: { type: handoff.type ?? "shipping", ...handoff },
          });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[negotiation ${state.id}] turn ${turn} error:`, err);
      await closeNegotiation(state.id, "rejected", `error: ${msg}`);
      emitNeg(state.id, {
        type: "negotiation_error",
        negotiationId: state.id,
        error: msg,
      });
      return;
    }
  }

  // Reached turn cap with no accept/reject
  await db
    .update(rentalNegotiations)
    .set({ status: "expired", turnCount: MAX_TURNS, closedAt: new Date() })
    .where(eq(rentalNegotiations.id, state.id));
  emitNeg(state.id, { type: "negotiation_expired", negotiationId: state.id });
}

// ─── single turn: let agent use info tools, then commit to ONE action tool ───

type TurnResult = {
  content: string;
  actionCall:
    | { name: string; input: Record<string, unknown>; id: string }
    | null;
};

async function runOneTurn(args: {
  speaker: Role;
  systemPrompt: string;
  transcript: { speaker: Role; content: string; toolCall: unknown | null }[];
  ctx: ToolContext;
  isFirstRequesterTurn: boolean;
}): Promise<TurnResult> {
  const messages: ChatMessage[] = buildMessages(args.transcript, args.speaker, args.isFirstRequesterTurn);
  let assistantScratch = "";
  let currentMessages = messages;

  for (let step = 0; step < MAX_INFO_STEPS_PER_TURN + 1; step++) {
    const resp = await anthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: args.systemPrompt,
      tools: toolSpecs,
      messages: currentMessages,
    });

    const texts = resp.content.filter((c): c is Anthropic.TextBlock => c.type === "text");
    const tools = resp.content.filter((c): c is Anthropic.ToolUseBlock => c.type === "tool_use");
    assistantScratch += texts.map((t) => t.text).join("\n");

    if (tools.length === 0) {
      // No tool use — treat as text-only turn (unusual; soft-reject).
      return { content: assistantScratch.trim(), actionCall: null };
    }

    const actionCall = tools.find((t) => ACTION_TOOLS.has(t.name));
    const infoCalls = tools.filter((t) => !ACTION_TOOLS.has(t.name));

    // Append the assistant turn (text + tool_use) + tool_results for info calls.
    currentMessages = [
      ...currentMessages,
      { role: "assistant", content: resp.content },
    ];

    if (actionCall) {
      const validation = await validateActionTool(
        actionCall.name,
        actionCall.input as Record<string, unknown>,
        args.ctx,
      );
      if (!validation.ok) {
        // Tell the agent why and let it retry within the same turn.
        currentMessages.push({
          role: "user",
          content: [
            ...tools.map((t) => ({
              type: "tool_result" as const,
              tool_use_id: t.id,
              content:
                t === actionCall
                  ? `ERROR: ${validation.error}`
                  : "skipped — fix the action tool error first",
              is_error: t === actionCall,
            })),
          ],
        });
        continue;
      }
      return {
        content: assistantScratch.trim(),
        actionCall: {
          name: actionCall.name,
          input: actionCall.input as Record<string, unknown>,
          id: actionCall.id,
        },
      };
    }

    if (step >= MAX_INFO_STEPS_PER_TURN) {
      // Too many info calls with no action; force the agent to commit.
      currentMessages.push({
        role: "user",
        content: [
          ...infoCalls.map((t) => ({
            type: "tool_result" as const,
            tool_use_id: t.id,
            content: "reached info-tool cap — use propose_rental / counter_offer / accept / reject now",
          })),
        ],
      });
      continue;
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const t of infoCalls) {
      try {
        const out = await runInfoTool(t.name, t.input as Record<string, unknown>, args.ctx);
        toolResults.push({
          type: "tool_result",
          tool_use_id: t.id,
          content: JSON.stringify(out),
        });
      } catch (err) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: t.id,
          content: `error: ${err instanceof Error ? err.message : String(err)}`,
          is_error: true,
        });
      }
    }
    currentMessages.push({ role: "user", content: toolResults });
  }

  return { content: assistantScratch.trim(), actionCall: null };
}

function buildMessages(
  transcript: { speaker: Role; content: string; toolCall: unknown | null }[],
  speaker: Role,
  isFirstRequesterTurn: boolean,
): ChatMessage[] {
  const out: ChatMessage[] = [];
  if (transcript.length === 0 && speaker === "requester_agent" && isFirstRequesterTurn) {
    out.push({
      role: "user",
      content:
        "Open the negotiation. Make your first proposal via propose_rental after (optionally) calling query_friend_closet to confirm the item.",
    });
    return out;
  }

  // Convert transcript into alternating user/assistant from the current speaker's POV.
  // All prior turns from THIS speaker are "assistant"; all turns from the other are "user".
  for (const t of transcript) {
    const role: "user" | "assistant" = t.speaker === speaker ? "assistant" : "user";
    const chunk = t.toolCall
      ? `${t.content}\n[action taken: ${(t.toolCall as { name?: string }).name} ${JSON.stringify((t.toolCall as { input?: unknown }).input ?? {})}]`
      : t.content;
    const last = out[out.length - 1];
    if (last && last.role === role && typeof last.content === "string") {
      last.content = `${last.content}\n\n${chunk}`;
    } else {
      out.push({ role, content: chunk });
    }
  }

  if (out.length === 0 || out[out.length - 1].role !== "user") {
    out.push({ role: "user", content: "It is your turn. Respond with exactly one action tool." });
  }
  return out;
}

function latestProposal(
  transcript: { speaker: Role; content: string; toolCall: unknown | null }[],
): { priceUsd: number; durationDays?: number; handoff: { type: string; datetime?: string; location?: string } } | null {
  for (let i = transcript.length - 1; i >= 0; i--) {
    const call = transcript[i].toolCall as { name?: string; input?: Record<string, unknown> } | null;
    if (!call) continue;
    if (call.name === "propose_rental" || call.name === "counter_offer") {
      const input = call.input ?? {};
      const price = Number(input.price_usd);
      const duration = Number(input.duration_days);
      const handoff = (input.handoff as { type?: string; datetime?: string; location?: string }) ?? {
        type: "shipping",
      };
      if (!Number.isFinite(price)) {
        // counter_offer may have omitted price; walk further back to find the last priced proposal
        continue;
      }
      return {
        priceUsd: price,
        durationDays: Number.isFinite(duration) ? duration : undefined,
        handoff: { type: handoff.type ?? "shipping", ...handoff },
      };
    }
  }
  return null;
}

async function persistMessage(
  negotiationId: string,
  turn: number,
  speaker: Role,
  content: string,
  actionCall: unknown,
) {
  await db.insert(negotiationMessages).values({
    negotiationId,
    speaker,
    content,
    toolCall: actionCall as object | null,
  });
  await db
    .update(rentalNegotiations)
    .set({ turnCount: turn })
    .where(eq(rentalNegotiations.id, negotiationId));
}

type HandoffType = "calendar_event" | "shipping" | "in_person";

function normalizeHandoff(h: {
  type: string;
  datetime?: string;
  location?: string;
}): { type: HandoffType; datetime?: string; location?: string } {
  const t: HandoffType =
    h.type === "calendar_event" || h.type === "shipping" || h.type === "in_person"
      ? h.type
      : "shipping";
  return { type: t, datetime: h.datetime, location: h.location };
}

async function closeNegotiation(
  negotiationId: string,
  status: "accepted" | "rejected" | "expired",
  _reasoning: string,
) {
  await db
    .update(rentalNegotiations)
    .set({ status, closedAt: new Date() })
    .where(eq(rentalNegotiations.id, negotiationId));
}
