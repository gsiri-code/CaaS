import { db, schema } from "@/db";
import { and, ne, eq, sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";
import { embedText } from "@/lib/clients/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const url = new URL(req.url);
  const user = await getSessionUser({ as: url.searchParams.get("as") ?? undefined });
  const body = await req.json();
  const { queryText, maxPricePerDay } = body as {
    queryText: string;
    maxPricePerDay?: number;
  };

  if (!queryText || typeof queryText !== "string") {
    return Response.json({ error: "queryText required" }, { status: 400 });
  }

  const embedding = await embedText(queryText);

  // Search friends' garments (not the user's own) using text embedding similarity
  const matches = await db
    .select({
      id: schema.garments.id,
      category: schema.garments.category,
      subcategory: schema.garments.subcategory,
      brandGuess: schema.garments.brandGuess,
      description: schema.garments.description,
      heroImageUrl: schema.garments.heroImageUrl,
      estimatedValueUsd: schema.garments.estimatedValueUsd,
      vault: schema.garments.vault,
      userId: schema.garments.userId,
      ownerName: schema.users.name,
      similarity: sql<number>`1 - (${schema.garments.textEmbedding} <=> ${JSON.stringify(embedding)}::vector)`.as("similarity"),
    })
    .from(schema.garments)
    .innerJoin(schema.users, eq(schema.garments.userId, schema.users.id))
    .where(
      and(
        ne(schema.garments.userId, user.id),
        eq(schema.garments.vault, false),
      ),
    )
    .orderBy(sql`${schema.garments.textEmbedding} <=> ${JSON.stringify(embedding)}::vector`)
    .limit(10);

  const results = matches.map((m) => ({
    ...m,
    matchPercent: Math.round(m.similarity * 100),
    estimatedDailyRental: m.estimatedValueUsd
      ? Math.round(m.estimatedValueUsd * 0.1)
      : null,
  }));

  const filtered =
    maxPricePerDay && maxPricePerDay > 0
      ? results.filter(
          (r) =>
            !r.estimatedDailyRental || r.estimatedDailyRental <= maxPricePerDay,
        )
      : results;

  return Response.json({ matches: filtered });
}
