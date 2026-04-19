import { db, isDatabaseConfigured, schema } from "@/db";
import { and, eq, ne, or, sql } from "drizzle-orm";
import { createBus, emitIngest } from "@/lib/ingest/events";
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
import type { DemoUser, DemoUserKey } from "@/lib/session";
import { shouldUseMockDataForUser } from "@/lib/session";

export type NegotiationPatch = {
  status?: string;
  agreedPriceUsd?: number;
  agreedHandoff?: unknown;
};

export type CreateNegotiationInput = {
  garmentId: string;
  ownerId: string;
};

export type WishlistSearchInput = {
  queryText: string;
  maxPricePerDay?: number;
};

export type IngestBatchResult = {
  batch_id: string;
  accepted: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function withDomainFallback<T>(user: DemoUser, real: () => Promise<T>, mock: () => any) {
  if (shouldUseMockDataForUser(user) || !isDatabaseConfigured()) return await mock();
  try {
    return await real();
  } catch {
    return await mock();
  }
}

export async function listClosetGarments(user: DemoUser) {
  return withDomainFallback(
    user,
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

export async function getClosetGarmentDetail(id: string, user: DemoUser) {
  return withDomainFallback(
    user,
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

export async function updateClosetGarment(id: string, user: DemoUser, updates: { vault?: boolean }) {
  return withDomainFallback(
    user,
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

export async function searchWishlistItems(user: DemoUser, input: WishlistSearchInput) {
  return withDomainFallback(
    user,
    async () => {
      const { embedText } = await import("@/lib/clients/gemini");
      const embedding = await embedText(input.queryText);
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

      const results = matches.map((match) => ({
        ...match,
        matchPercent: Math.round(match.similarity * 100),
        estimatedDailyRental: match.estimatedValueUsd ? Math.round(match.estimatedValueUsd * 0.1) : null,
      }));

      return {
        matches:
          input.maxPricePerDay && input.maxPricePerDay > 0
            ? results.filter(
                (result) => !result.estimatedDailyRental || result.estimatedDailyRental <= input.maxPricePerDay!,
              )
            : results,
      };
    },
    () => searchMockWishlist(user, input.queryText, input.maxPricePerDay),
  );
}

export async function listAppNegotiations(user: DemoUser) {
  return withDomainFallback(
    user,
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
        .where(
          or(eq(schema.rentalNegotiations.requesterId, user.id), eq(schema.rentalNegotiations.ownerId, user.id)),
        )
        .orderBy(schema.rentalNegotiations.createdAt),
    () => listMockNegotiations(user),
  );
}

export async function createAppNegotiation(user: DemoUser, input: CreateNegotiationInput) {
  return withDomainFallback(
    user,
    async () => {
      const [negotiation] = await db
        .insert(schema.rentalNegotiations)
        .values({ requesterId: user.id, ownerId: input.ownerId, garmentId: input.garmentId })
        .returning();
      return negotiation;
    },
    () => createMockNegotiation(user, input.ownerId, input.garmentId),
  );
}

export async function getAppNegotiationDetail(id: string, user: DemoUser) {
  return withDomainFallback(
    user,
    async () => {
      const [negotiation] = await db
        .select()
        .from(schema.rentalNegotiations)
        .where(
          and(
            eq(schema.rentalNegotiations.id, id),
            or(eq(schema.rentalNegotiations.requesterId, user.id), eq(schema.rentalNegotiations.ownerId, user.id)),
          ),
        )
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

export async function updateAppNegotiation(id: string, user: DemoUser, updates: NegotiationPatch) {
  return withDomainFallback(
    user,
    async () => {
      const nextUpdates: Record<string, unknown> = { ...updates };
      if (updates.status && ["accepted", "rejected", "expired"].includes(updates.status)) {
        nextUpdates.closedAt = new Date();
      }
      const [updated] = await db
        .update(schema.rentalNegotiations)
        .set(nextUpdates)
        .where(
          and(
            eq(schema.rentalNegotiations.id, id),
            or(eq(schema.rentalNegotiations.requesterId, user.id), eq(schema.rentalNegotiations.ownerId, user.id)),
          ),
        )
        .returning();
      return updated ?? null;
    },
    () => updateMockNegotiation(id, updates),
  );
}

export async function startMockIngestBatch(user: DemoUser | DemoUserKey) {
  const asKey = typeof user === "string" ? user : user.key;
  const batch = createMockIngestBatch(asKey);
  createBus(batch.batchId);
  let delay = 0;
  for (const event of batch.events) {
    delay += 250;
    setTimeout(() => emitIngest(batch.batchId, event as Parameters<typeof emitIngest>[1]), delay);
  }
  return { batch_id: batch.batchId, accepted: batch.accepted } satisfies IngestBatchResult;
}
