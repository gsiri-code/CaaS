import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { rentalNegotiations } from "@/db/schema";
import { DEMO_USERS, isDemoUserKey } from "@/lib/demo-users";

export const runtime = "nodejs";

const schema = z.object({ as: z.enum(["alice", "bob"]).optional() });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const asKey = parsed.data.as && isDemoUserKey(parsed.data.as) ? parsed.data.as : "alice";
  const user = DEMO_USERS[asKey];

  const [neg] = await db.select().from(rentalNegotiations).where(eq(rentalNegotiations.id, id));
  if (!neg) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (neg.requesterId !== user.id && neg.ownerId !== user.id) {
    return NextResponse.json({ error: "not your negotiation" }, { status: 403 });
  }
  await db
    .update(rentalNegotiations)
    .set({ status: "rejected", closedAt: new Date() })
    .where(eq(rentalNegotiations.id, id));
  return NextResponse.json({ ok: true, status: "rejected" });
}
