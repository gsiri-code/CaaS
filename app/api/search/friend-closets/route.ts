import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { garments } from "@/db/schema";
import { DEMO_USERS, isDemoUserKey } from "@/lib/demo-users";
import { embedText } from "@/lib/clients/gemini";
import { embedImage } from "@/lib/clients/fashionclip";
import { getFriendIds, getUsersById } from "@/lib/friends";

export const runtime = "nodejs";

const bodySchema = z.object({
  as: z.enum(["alice", "bob"]).optional(),
  query_text: z.string().min(1).optional(),
  reference_image_base64: z.string().min(10).optional(),
  category: z.string().optional(),
  limit: z.number().int().positive().max(50).optional(),
});

type Match = {
  garment: {
    id: string;
    category: string;
    subcategory: string | null;
    colorPrimary: string | null;
    brandGuess: string | null;
    description: string;
    heroImageUrl: string;
  };
  owner: { id: string; name: string; email: string };
  textDistance: number | null;
  imageDistance: number | null;
  score: number;
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const { query_text, reference_image_base64, category, limit = 10 } = parsed.data;
  if (!query_text && !reference_image_base64) {
    return NextResponse.json(
      { error: "provide query_text, reference_image_base64, or both" },
      { status: 400 },
    );
  }

  const asKey = parsed.data.as && isDemoUserKey(parsed.data.as) ? parsed.data.as : "alice";
  const userId = DEMO_USERS[asKey].id;

  const friendIds = await getFriendIds(userId);
  if (friendIds.length === 0) {
    return NextResponse.json({ matches: [] satisfies Match[] });
  }

  const [textVec, imageVec] = await Promise.all([
    query_text ? embedText(query_text) : Promise.resolve(null),
    reference_image_base64
      ? embedImage(Buffer.from(reference_image_base64, "base64"))
      : Promise.resolve(null),
  ]);

  const literalOf = (v: number[]) => `[${v.join(",")}]`;

  const conds = [inArray(garments.userId, friendIds), eq(garments.vault, false)];
  if (category) conds.push(eq(garments.category, category));

  const textDistExpr = textVec
    ? sql<number>`(${garments.textEmbedding} <=> ${literalOf(textVec)}::vector)`
    : sql<number | null>`NULL::float`;
  const imageDistExpr = imageVec
    ? sql<number>`(${garments.imageEmbedding} <=> ${literalOf(imageVec)}::vector)`
    : sql<number | null>`NULL::float`;

  // Rank by whichever distance is available; blend evenly when both.
  let rankExpr;
  if (textVec && imageVec) {
    rankExpr = sql<number>`((${garments.textEmbedding} <=> ${literalOf(textVec)}::vector) + (${garments.imageEmbedding} <=> ${literalOf(imageVec)}::vector)) / 2`;
  } else if (textVec) {
    rankExpr = sql<number>`${garments.textEmbedding} <=> ${literalOf(textVec)}::vector`;
  } else {
    rankExpr = sql<number>`${garments.imageEmbedding} <=> ${literalOf(imageVec!)}::vector`;
  }

  const rows = await db
    .select({
      id: garments.id,
      userId: garments.userId,
      category: garments.category,
      subcategory: garments.subcategory,
      colorPrimary: garments.colorPrimary,
      brandGuess: garments.brandGuess,
      description: garments.description,
      heroImageUrl: garments.heroImageUrl,
      textDistance: textDistExpr.as("text_distance"),
      imageDistance: imageDistExpr.as("image_distance"),
      score: rankExpr.as("score"),
    })
    .from(garments)
    .where(and(...conds))
    .orderBy(sql`score`)
    .limit(limit);

  const ownerMap = await getUsersById(Array.from(new Set(rows.map((r) => r.userId))));

  const matches: Match[] = rows.map((r) => ({
    garment: {
      id: r.id,
      category: r.category,
      subcategory: r.subcategory,
      colorPrimary: r.colorPrimary,
      brandGuess: r.brandGuess,
      description: r.description,
      heroImageUrl: r.heroImageUrl,
    },
    owner: ownerMap.get(r.userId) ?? {
      id: r.userId,
      name: "unknown",
      email: "",
    },
    textDistance: r.textDistance === null ? null : Number(r.textDistance),
    imageDistance: r.imageDistance === null ? null : Number(r.imageDistance),
    score: Number(r.score),
  }));

  return NextResponse.json({ matches });
}
