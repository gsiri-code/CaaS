import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { garments, garmentPhotos, photos } from "@/db/schema";
import { embedText } from "@/lib/clients/gemini";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    category: z.string().optional(),
    subcategory: z.string().nullable().optional(),
    colorPrimary: z.string().optional(),
    colorSecondary: z.string().nullable().optional(),
    pattern: z.string().optional(),
    silhouette: z.string().optional(),
    brandGuess: z.string().nullable().optional(),
    description: z.string().min(1).optional(),
    estimatedValueUsd: z.number().int().nullable().optional(),
    vault: z.boolean().optional(),
  })
  .strict();

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getSessionUser({ as: req.nextUrl.searchParams.get("as") ?? undefined });
  const [row] = await db
    .select()
    .from(garments)
    .where(and(eq(garments.id, id), eq(garments.userId, user.id)));
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const contributors = await db
    .select({
      id: garmentPhotos.id,
      photoId: garmentPhotos.photoId,
      photoUrl: photos.fileUrl,
      cropBbox: garmentPhotos.cropBbox,
      extractionConfidence: garmentPhotos.extractionConfidence,
    })
    .from(garmentPhotos)
    .innerJoin(photos, eq(photos.id, garmentPhotos.photoId))
    .where(eq(garmentPhotos.garmentId, id));

  return NextResponse.json({
    garment: {
      id: row.id,
      userId: row.userId,
      category: row.category,
      subcategory: row.subcategory,
      colorPrimary: row.colorPrimary,
      colorSecondary: row.colorSecondary,
      pattern: row.pattern,
      silhouette: row.silhouette,
      brandGuess: row.brandGuess,
      brandConfidence: row.brandConfidence,
      description: row.description,
      heroImageUrl: row.heroImageUrl,
      estimatedValueUsd: row.estimatedValueUsd,
      wearCount: row.wearCount,
      lastWornAt: row.lastWornAt,
      vault: row.vault,
      createdAt: row.createdAt,
    },
    photos: contributors,
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getSessionUser({ as: req.nextUrl.searchParams.get("as") ?? undefined });
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const patch = parsed.data;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const update: Record<string, unknown> = { ...patch };
  if (patch.description) {
    update.textEmbedding = await embedText(patch.description);
  }

  const [row] = await db
    .update(garments)
    .set(update)
    .where(and(eq(garments.id, id), eq(garments.userId, user.id)))
    .returning({ id: garments.id });

  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ id: row.id });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getSessionUser({ as: req.nextUrl.searchParams.get("as") ?? undefined });
  const rows = await db
    .delete(garments)
    .where(and(eq(garments.id, id), eq(garments.userId, user.id)))
    .returning({ id: garments.id });
  if (rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ id: rows[0].id });
}
