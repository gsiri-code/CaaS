import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { garments, garmentPhotos } from "@/db/schema";

export const runtime = "nodejs";

const bodySchema = z.object({
  garment_ids: z.array(z.string().uuid()).length(2),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "expected {garment_ids: [a, b]}" }, { status: 400 });
  }
  const [aId, bId] = parsed.data.garment_ids;
  if (aId === bId) return NextResponse.json({ error: "ids must differ" }, { status: 400 });

  const rows = await db
    .select()
    .from(garments)
    .where(inArray(garments.id, [aId, bId]));
  if (rows.length !== 2) {
    return NextResponse.json({ error: "garment(s) not found" }, { status: 404 });
  }
  const a = rows.find((r) => r.id === aId)!;
  const b = rows.find((r) => r.id === bId)!;
  if (a.userId !== b.userId) {
    return NextResponse.json(
      { error: "cannot merge across users" },
      { status: 400 },
    );
  }

  // Keep the earlier-created row as canonical.
  const keeper = a.createdAt <= b.createdAt ? a : b;
  const dropped = keeper.id === a.id ? b : a;

  await db
    .update(garmentPhotos)
    .set({ garmentId: keeper.id })
    .where(eq(garmentPhotos.garmentId, dropped.id));

  await db.delete(garments).where(eq(garments.id, dropped.id));

  return NextResponse.json({ kept: keeper.id, dropped: dropped.id });
}
