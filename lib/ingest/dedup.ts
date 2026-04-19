import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { garments, garmentPhotos } from "@/db/schema";

// Cosine-distance threshold for treating a new crop as a duplicate of an existing garment.
// Lower distance = more similar. 1 - cosine_similarity = distance.
// TODO § Phase 2: start at 0.88 similarity → 0.12 distance; bias toward false splits.
export const DEDUP_DISTANCE_MAX = 0.12;

export type MatchCandidate = {
  garmentId: string;
  distance: number;
  existingConfidence: number | null;
};

export async function findDuplicate(params: {
  userId: string;
  category: string;
  embedding: number[];
}): Promise<MatchCandidate | null> {
  const { userId, category, embedding } = params;
  const literal = `[${embedding.join(",")}]`;
  const rows = await db
    .select({
      id: garments.id,
      dist: sql<number>`${garments.imageEmbedding} <=> ${literal}::vector`.as("dist"),
    })
    .from(garments)
    .where(and(eq(garments.userId, userId), eq(garments.category, category)))
    .orderBy(sql`dist`)
    .limit(1);

  if (rows.length === 0) return null;
  const top = rows[0];
  if (top.dist > DEDUP_DISTANCE_MAX) return null;
  return { garmentId: top.id, distance: top.dist, existingConfidence: null };
}

export async function attachPhotoToGarment(params: {
  garmentId: string;
  photoId: string;
  bbox: { x: number; y: number; w: number; h: number };
  extractionConfidence: number;
  newCropUrl: string;
  newCropBeatsHero: boolean;
}) {
  await db.insert(garmentPhotos).values({
    garmentId: params.garmentId,
    photoId: params.photoId,
    cropBbox: params.bbox,
    extractionConfidence: params.extractionConfidence,
  });

  if (params.newCropBeatsHero) {
    await db
      .update(garments)
      .set({ heroImageUrl: params.newCropUrl })
      .where(eq(garments.id, params.garmentId));
  }
}
