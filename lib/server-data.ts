import { db, isDatabaseConfigured } from "@/db";
import { and, eq, ne, or, sql } from "drizzle-orm";
import { schema } from "@/db";
import {
  createMockIngestBatch,
  createMockNegotiation,
  getMockGarment,
  getMockNegotiation,
  listMockGarments,
  listMockNegotiations,
  searchMockWishlist,
  updateMockGarment,
  updateMockNegotiation,
} from "@/lib/mock-data";
import { type DemoUser, type DemoUserKey, shouldUseMockData } from "@/lib/session";
import { createBus } from "@/lib/ingest/events";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function withFallback<T>(operation: () => Promise<T>, fallback: () => any): Promise<T> {
  if (shouldUseMockData() || !isDatabaseConfigured()) return fallback();
  try {
    return await operation();
  } catch {
    return fallback();
  }
}

export async function listGarments(user: DemoUser) {
  return withFallback(
    async () =>
      db
        .select({
          id: schema.garments.id,
          category: schema.garments.category,
          subcategory: schema.garments.subcategory,
          colorPrimary: schema.garments.colorPrimary,
          pattern: schema.garments.pattern,
          silhouette: schema.garments.silhouette,
          brandGuess: schema.garments.brandGuess,
          description: schema.garments.description,
          heroImageUrl: schema.garments.heroImageUrl,
          wearCount: schema.garments.wearCount,
          lastWornAt: schema.garments.lastWornAt,
          estimatedValueUsd: schema.garments.estimatedValueUsd,
          vault: schema.garments.vault,
          createdAt: schema.garments.createdAt,
        })
        .from(schema.garments)
        .where(eq(schema.garments.userId, user.id))
        .orderBy(schema.garments.createdAt),
    () => listMockGarments(user),
  );
}

export async function getGarmentDetail(id: string, user: DemoUser) {
  return withFallback(
    async () => {
      const [garment] = await db
        .select()
        .from(schema.garments)
        .where(and(eq(schema.garments.id, id), eq(schema.garments.userId, user.id)))
        .limit(1);

      if (!garment) return null;

      const photos = await db
        .select({
          id: schema.garmentPhotos.id,
          photoId: schema.garmentPhotos.photoId,
          cropBbox: schema.garmentPhotos.cropBbox,
          fileUrl: schema.photos.fileUrl,
        })
        .from(schema.garmentPhotos)
        .innerJoin(schema.photos, eq(schema.garmentPhotos.photoId, schema.photos.id))
        .where(eq(schema.garmentPhotos.garmentId, id));

      return {
        ...garment,
        imageEmbedding: undefined,
        textEmbedding: undefined,
        photos,
      };
    },
    () => getMockGarment(id, user),
  );
}

export async function patchGarment(id: string, user: DemoUser, updates: { vault?: boolean }) {
  return withFallback(
    async () => {
      const [updated] = await db
        .update(schema.garments)
        .set(updates)
        .where(and(eq(schema.garments.id, id), eq(schema.garments.userId, user.id)))
        .returning({ id: schema.garments.id, vault: schema.garments.vault });
      return updated ?? null;
    },
    () => updateMockGarment(id, user, updates),
  );
}

export async function searchWishlist(user: DemoUser, queryText: string, maxPricePerDay?: number) {
  return withFallback(
    async () => {
      const { embedText } = await import("@/lib/clients/gemini");
      const embedding = await embedText(queryText);
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
        .where(and(ne(schema.garments.userId, user.id), eq(schema.garments.vault, false)))
        .orderBy(sql`${schema.garments.textEmbedding} <=> ${JSON.stringify(embedding)}::vector`)
        .limit(10);

      const results = matches.map((m) => ({
        ...m,
        matchPercent: Math.round(m.similarity * 100),
        estimatedDailyRental: m.estimatedValueUsd ? Math.round(m.estimatedValueUsd * 0.1) : null,
      }));

      return {
        matches:
          maxPricePerDay && maxPricePerDay > 0
            ? results.filter((r) => !r.estimatedDailyRental || r.estimatedDailyRental <= maxPricePerDay)
            : results,
      };
    },
    () => searchMockWishlist(user, queryText, maxPricePerDay),
  );
}

export async function listNegotiations(user: DemoUser) {
  return withFallback(
    async () =>
      db
        .select({
          id: schema.rentalNegotiations.id,
          requesterId: schema.rentalNegotiations.requesterId,
          ownerId: schema.rentalNegotiations.ownerId,
          garmentId: schema.rentalNegotiations.garmentId,
          status: schema.rentalNegotiations.status,
          agreedPriceUsd: schema.rentalNegotiations.agreedPriceUsd,
          agreedHandoff: schema.rentalNegotiations.agreedHandoff,
          turnCount: schema.rentalNegotiations.turnCount,
          createdAt: schema.rentalNegotiations.createdAt,
          closedAt: schema.rentalNegotiations.closedAt,
          garmentCategory: schema.garments.category,
          garmentHeroUrl: schema.garments.heroImageUrl,
          garmentBrand: schema.garments.brandGuess,
          garmentDescription: schema.garments.description,
        })
        .from(schema.rentalNegotiations)
        .innerJoin(schema.garments, eq(schema.rentalNegotiations.garmentId, schema.garments.id))
        .where(or(eq(schema.rentalNegotiations.requesterId, user.id), eq(schema.rentalNegotiations.ownerId, user.id)))
        .orderBy(schema.rentalNegotiations.createdAt),
    () => listMockNegotiations(user),
  );
}

export async function createNegotiation(user: DemoUser, garmentId: string, ownerId: string) {
  return withFallback(
    async () => {
      const [negotiation] = await db
        .insert(schema.rentalNegotiations)
        .values({ requesterId: user.id, ownerId, garmentId })
        .returning();
      return negotiation;
    },
    () => createMockNegotiation(user, ownerId, garmentId),
  );
}

export async function getNegotiationDetail(id: string) {
  return withFallback(
    async () => {
      const [negotiation] = await db
        .select()
        .from(schema.rentalNegotiations)
        .where(eq(schema.rentalNegotiations.id, id))
        .limit(1);

      if (!negotiation) return null;

      const messages = await db
        .select({
          id: schema.negotiationMessages.id,
          speaker: schema.negotiationMessages.speaker,
          content: schema.negotiationMessages.content,
          toolCall: schema.negotiationMessages.toolCall,
          createdAt: schema.negotiationMessages.createdAt,
        })
        .from(schema.negotiationMessages)
        .where(eq(schema.negotiationMessages.negotiationId, id))
        .orderBy(schema.negotiationMessages.createdAt);

      const [garment] = await db
        .select({
          id: schema.garments.id,
          category: schema.garments.category,
          brandGuess: schema.garments.brandGuess,
          description: schema.garments.description,
          heroImageUrl: schema.garments.heroImageUrl,
          estimatedValueUsd: schema.garments.estimatedValueUsd,
        })
        .from(schema.garments)
        .where(eq(schema.garments.id, negotiation.garmentId))
        .limit(1);

      return { ...negotiation, messages, garment };
    },
    () => getMockNegotiation(id),
  );
}

export async function patchNegotiation(
  id: string,
  updates: { status?: string; agreedPriceUsd?: number; agreedHandoff?: unknown },
) {
  return withFallback(
    async () => {
      const nextUpdates: Record<string, unknown> = { ...updates };
      if (updates.status && ["accepted", "rejected", "expired"].includes(updates.status)) {
        nextUpdates.closedAt = new Date();
      }
      const [updated] = await db
        .update(schema.rentalNegotiations)
        .set(nextUpdates)
        .where(eq(schema.rentalNegotiations.id, id))
        .returning();
      return updated ?? null;
    },
    () => updateMockNegotiation(id, updates),
  );
}

export async function createIngestBatch(asKey: DemoUserKey) {
  return withFallback(
    async () => {
      const route = await import("@/app/api/ingest/upload/route");
      return route.createRealIngestBatch(asKey);
    },
    () => {
      const batch = createMockIngestBatch(asKey);
      const bus = createBus(batch.batchId);
      let delay = 0;
      for (const event of batch.events) {
        delay += 250;
        setTimeout(() => bus.push(event), delay);
      }
      return { batch_id: batch.batchId, accepted: batch.accepted };
    },
  );
}
