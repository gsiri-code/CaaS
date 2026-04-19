import { db, schema } from "@/db";
import { eq, or } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const user = await getSessionUser({ as: url.searchParams.get("as") ?? undefined });

  const negotiations = await db
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
    .innerJoin(
      schema.garments,
      eq(schema.rentalNegotiations.garmentId, schema.garments.id),
    )
    .where(
      or(
        eq(schema.rentalNegotiations.requesterId, user.id),
        eq(schema.rentalNegotiations.ownerId, user.id),
      ),
    )
    .orderBy(schema.rentalNegotiations.createdAt);

  return Response.json(negotiations);
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const user = await getSessionUser({ as: url.searchParams.get("as") ?? undefined });
  const body = await req.json();
  const { garmentId, ownerId } = body as { garmentId: string; ownerId: string };

  if (!garmentId || !ownerId) {
    return Response.json({ error: "garmentId and ownerId required" }, { status: 400 });
  }

  const [negotiation] = await db
    .insert(schema.rentalNegotiations)
    .values({
      requesterId: user.id,
      ownerId,
      garmentId,
    })
    .returning();

  return Response.json(negotiation, { status: 201 });
}
