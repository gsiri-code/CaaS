import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [negotiation] = await db
    .select()
    .from(schema.rentalNegotiations)
    .where(eq(schema.rentalNegotiations.id, id))
    .limit(1);

  if (!negotiation) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

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

  return Response.json({
    ...negotiation,
    messages,
    garment,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const { status, agreedPriceUsd, agreedHandoff } = body as {
    status?: string;
    agreedPriceUsd?: number;
    agreedHandoff?: unknown;
  };

  const updates: Record<string, unknown> = {};
  if (status) {
    updates.status = status;
    if (status === "accepted" || status === "rejected" || status === "expired") {
      updates.closedAt = new Date();
    }
  }
  if (agreedPriceUsd !== undefined) updates.agreedPriceUsd = agreedPriceUsd;
  if (agreedHandoff !== undefined) updates.agreedHandoff = agreedHandoff;

  const [updated] = await db
    .update(schema.rentalNegotiations)
    .set(updates)
    .where(eq(schema.rentalNegotiations.id, id))
    .returning();

  if (!updated) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(updated);
}
