import { and, eq, inArray, sql } from "drizzle-orm";
import type Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { garments } from "@/db/schema";
import { embedText } from "@/lib/clients/gemini";

// ─── Tool definitions as given to Claude ─────────────────────────────────────

export type AgentRole = "requester_agent" | "owner_agent";

export const toolSpecs: Anthropic.Tool[] = [
  {
    name: "query_my_closet",
    description:
      "Search the user you represent's own closet. Use this to check what you already own or to reference a similar item you've rented before.",
    input_schema: {
      type: "object",
      properties: {
        natural_language: { type: "string", description: "free-text query" },
        category: {
          type: "string",
          enum: ["top", "bottom", "dress", "outerwear", "shoe", "accessory"],
        },
      },
      required: ["natural_language"],
    },
  },
  {
    name: "query_friend_closet",
    description:
      "Search the other party's closet. Returns summaries (id, category, color, description). Vault-flagged items are hidden.",
    input_schema: {
      type: "object",
      properties: {
        natural_language: { type: "string" },
        category: {
          type: "string",
          enum: ["top", "bottom", "dress", "outerwear", "shoe", "accessory"],
        },
      },
      required: ["natural_language"],
    },
  },
  {
    name: "propose_rental",
    description:
      "Make an initial rental proposal. Use this ONLY on your first action turn. Subsequent offers must use counter_offer.",
    input_schema: {
      type: "object",
      properties: {
        garment_id: { type: "string", description: "uuid of the garment being rented" },
        price_usd: { type: "integer", description: "total rental price in USD" },
        duration_days: { type: "integer", minimum: 1, maximum: 30 },
        handoff: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["shipping", "in_person"] },
            datetime: { type: "string" },
            location: { type: "string" },
          },
          required: ["type"],
        },
        message: { type: "string", description: "one-sentence pitch to the other agent" },
      },
      required: ["garment_id", "price_usd", "duration_days", "handoff", "message"],
    },
  },
  {
    name: "counter_offer",
    description:
      "Respond to the other agent's latest offer with a revised proposal. Do not repeat the previous numbers verbatim.",
    input_schema: {
      type: "object",
      properties: {
        price_usd: { type: "integer" },
        duration_days: { type: "integer", minimum: 1, maximum: 30 },
        handoff: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["shipping", "in_person"] },
            datetime: { type: "string" },
            location: { type: "string" },
          },
          required: ["type"],
        },
        reasoning: { type: "string", description: "why you're countering this way" },
      },
      required: ["reasoning"],
    },
  },
  {
    name: "accept",
    description:
      "Accept the other agent's most recent offer as-is. Ends the negotiation successfully.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "reject",
    description:
      "Walk away from the negotiation. Use when the gap is too wide or the item is off-limits.",
    input_schema: {
      type: "object",
      properties: {
        reasoning: { type: "string" },
      },
      required: ["reasoning"],
    },
  },
];

export const ACTION_TOOLS = new Set(["propose_rental", "counter_offer", "accept", "reject"]);

// ─── Executor for info tools (runs synchronously, returns JSON to the agent) ──

export type ToolContext = {
  myUserId: string;
  otherUserId: string;
  negotiatedGarmentId: string;
};

async function vectorSearch(
  userId: string,
  query: string,
  category: string | undefined,
  excludeVault: boolean,
): Promise<unknown[]> {
  const queryVec = await embedText(query);
  const literal = `[${queryVec.join(",")}]`;

  const conds = [eq(garments.userId, userId)];
  if (category) conds.push(eq(garments.category, category));
  if (excludeVault) conds.push(eq(garments.vault, false));

  const rows = await db
    .select({
      id: garments.id,
      category: garments.category,
      subcategory: garments.subcategory,
      colorPrimary: garments.colorPrimary,
      pattern: garments.pattern,
      brandGuess: garments.brandGuess,
      description: garments.description,
      estimatedValueUsd: garments.estimatedValueUsd,
      distance: sql<number>`${garments.textEmbedding} <=> ${literal}::vector`.as("d"),
    })
    .from(garments)
    .where(and(...conds))
    .orderBy(sql`d`)
    .limit(5);

  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    subcategory: r.subcategory,
    color: r.colorPrimary,
    pattern: r.pattern,
    brand_guess: r.brandGuess,
    description: r.description,
    estimated_value_usd: r.estimatedValueUsd,
    distance: Number(r.distance).toFixed(3),
  }));
}

export async function runInfoTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  switch (name) {
    case "query_my_closet":
      return vectorSearch(
        ctx.myUserId,
        String(input.natural_language ?? ""),
        typeof input.category === "string" ? input.category : undefined,
        false,
      );
    case "query_friend_closet":
      return vectorSearch(
        ctx.otherUserId,
        String(input.natural_language ?? ""),
        typeof input.category === "string" ? input.category : undefined,
        true,
      );
    default:
      throw new Error(`unknown info tool: ${name}`);
  }
}

// Validate an action tool's input against the DB / state before we persist it.
export async function validateActionTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (name === "propose_rental" || name === "counter_offer") {
    const gid = (input as { garment_id?: string }).garment_id ?? ctx.negotiatedGarmentId;
    if (name === "propose_rental") {
      if (gid !== ctx.negotiatedGarmentId) {
        return {
          ok: false,
          error: `garment_id must be ${ctx.negotiatedGarmentId} (the negotiated item)`,
        };
      }
    }
    const price = (input as { price_usd?: unknown }).price_usd;
    if (name === "propose_rental" && (typeof price !== "number" || price <= 0)) {
      return { ok: false, error: "price_usd must be a positive integer" };
    }
    const rows = await db
      .select({ id: garments.id, vault: garments.vault })
      .from(garments)
      .where(inArray(garments.id, [gid]));
    if (rows.length === 0) return { ok: false, error: `garment ${gid} not found` };
    if (rows[0].vault) return { ok: false, error: `garment ${gid} is vaulted and cannot be rented` };
  }
  return { ok: true };
}
