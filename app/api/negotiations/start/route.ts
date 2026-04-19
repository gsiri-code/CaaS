import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { garments, rentalNegotiations, users } from "@/db/schema";
import { startNegotiation } from "@/lib/agents/loop";
import { DEMO_USERS, isDemoUserKey } from "@/lib/demo-users";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  as: z.enum(["alice", "bob"]).optional(),
  owner_id: z.string().uuid().optional(),
  owner_as: z.enum(["alice", "bob"]).optional(),
  garment_id: z.string().uuid(),
  max_price_usd: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const { garment_id, max_price_usd } = parsed.data;

  const requesterKey =
    parsed.data.as && isDemoUserKey(parsed.data.as) ? parsed.data.as : "alice";
  const requester = DEMO_USERS[requesterKey];

  const [g] = await db
    .select({
      id: garments.id,
      userId: garments.userId,
      vault: garments.vault,
    })
    .from(garments)
    .where(eq(garments.id, garment_id));
  if (!g) return NextResponse.json({ error: "garment not found" }, { status: 404 });
  if (g.vault)
    return NextResponse.json({ error: "garment is vaulted and cannot be rented" }, { status: 400 });
  if (g.userId === requester.id)
    return NextResponse.json({ error: "cannot negotiate with yourself" }, { status: 400 });

  const [owner] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, g.userId));
  if (!owner) return NextResponse.json({ error: "owner not found" }, { status: 404 });

  const [row] = await db
    .insert(rentalNegotiations)
    .values({
      requesterId: requester.id,
      ownerId: owner.id,
      garmentId: garment_id,
      status: "open",
    })
    .returning({ id: rentalNegotiations.id });

  // Fire-and-forget; the SSE endpoint subscribes via the event bus.
  void startNegotiation({
    negotiationId: row.id,
    requesterId: requester.id,
    requesterName: requester.name,
    ownerId: owner.id,
    ownerName: owner.name,
    garmentId: garment_id,
    maxPriceUsd: max_price_usd,
  });

  return NextResponse.json({ negotiation_id: row.id });
}
