import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { garments, negotiationMessages, rentalNegotiations, users } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const [neg] = await db.select().from(rentalNegotiations).where(eq(rentalNegotiations.id, id));
  if (!neg) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [g] = await db.select().from(garments).where(eq(garments.id, neg.garmentId));
  const [requester] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, neg.requesterId));
  const [owner] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, neg.ownerId));

  const messages = await db
    .select()
    .from(negotiationMessages)
    .where(eq(negotiationMessages.negotiationId, id))
    .orderBy(asc(negotiationMessages.createdAt));

  return NextResponse.json({
    negotiation: {
      id: neg.id,
      status: neg.status,
      agreedPriceUsd: neg.agreedPriceUsd,
      agreedHandoff: neg.agreedHandoff,
      turnCount: neg.turnCount,
      createdAt: neg.createdAt,
      closedAt: neg.closedAt,
    },
    requester,
    owner,
    garment: g
      ? {
          id: g.id,
          category: g.category,
          subcategory: g.subcategory,
          colorPrimary: g.colorPrimary,
          description: g.description,
          heroImageUrl: g.heroImageUrl,
          estimatedValueUsd: g.estimatedValueUsd,
        }
      : null,
    messages,
  });
}
