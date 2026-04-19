import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { garments } from "@/db/schema";
import { DEMO_USERS, isDemoUserKey } from "@/lib/demo-users";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const asParam = sp.get("as");
  const asKey = isDemoUserKey(asParam) ? asParam : "alice";
  const userId = DEMO_USERS[asKey].id;

  const category = sp.get("category");
  const color = sp.get("color");
  const brand = sp.get("brand");
  const limit = Math.min(Number(sp.get("limit") ?? 100), 200);
  const offset = Math.max(Number(sp.get("offset") ?? 0), 0);

  const conds = [eq(garments.userId, userId)];
  if (category) conds.push(eq(garments.category, category));
  if (color) conds.push(ilike(garments.colorPrimary, `%${color}%`));
  if (brand) conds.push(ilike(garments.brandGuess, `%${brand}%`));

  const rows = await db
    .select({
      id: garments.id,
      category: garments.category,
      subcategory: garments.subcategory,
      colorPrimary: garments.colorPrimary,
      pattern: garments.pattern,
      brandGuess: garments.brandGuess,
      description: garments.description,
      heroImageUrl: garments.heroImageUrl,
      vault: garments.vault,
      createdAt: garments.createdAt,
    })
    .from(garments)
    .where(and(...conds))
    .orderBy(desc(garments.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ garments: rows });
}
