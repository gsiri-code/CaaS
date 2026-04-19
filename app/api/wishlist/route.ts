import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { wishlistItems } from "@/db/schema";
import { embedText } from "@/lib/clients/gemini";
import { getSessionUser } from "@/lib/session";
import { embedImage } from "@/lib/clients/fashionclip";
import { ensureBatchDirs, cropPath, cropPublicUrl, writeBytes } from "@/lib/ingest/storage";

export const runtime = "nodejs";

const postSchema = z.object({
  as: z.string().optional(),
  query_text: z.string().min(1),
  reference_image_base64: z.string().min(10).optional(),
  reference_image_mime: z.string().optional(),
  max_rental_price_usd: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const { query_text, reference_image_base64, max_rental_price_usd } = parsed.data;
  const user = await getSessionUser({ as: parsed.data.as });
  const userId = user.id;

  let referenceImageUrl: string | null = null;
  let referenceImageEmbedding: number[] | null = null;
  if (reference_image_base64) {
    const bytes = Buffer.from(reference_image_base64, "base64");
    // Stash the reference image alongside other uploads so the page can render it.
    const pseudoBatch = `wishlist-${userId.slice(0, 8)}`;
    const cropId = randomUUID();
    await ensureBatchDirs(pseudoBatch);
    await writeBytes(cropPath(pseudoBatch, cropId), bytes);
    referenceImageUrl = cropPublicUrl(pseudoBatch, cropId);
    referenceImageEmbedding = await embedImage(bytes);
  }

  const queryEmbedding = await embedText(query_text);

  const [row] = await db
    .insert(wishlistItems)
    .values({
      userId,
      queryText: query_text,
      queryEmbedding,
      referenceImageUrl,
      referenceImageEmbedding,
      maxRentalPriceUsd: max_rental_price_usd ?? null,
    })
    .returning({ id: wishlistItems.id });

  return NextResponse.json({ id: row.id });
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser({ as: req.nextUrl.searchParams.get("as") ?? undefined });
  const userId = user.id;

  const rows = await db
    .select({
      id: wishlistItems.id,
      queryText: wishlistItems.queryText,
      referenceImageUrl: wishlistItems.referenceImageUrl,
      maxRentalPriceUsd: wishlistItems.maxRentalPriceUsd,
      createdAt: wishlistItems.createdAt,
    })
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, userId))
    .orderBy(desc(wishlistItems.createdAt))
    .limit(20);

  return NextResponse.json({ items: rows });
}
