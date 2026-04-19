import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const user = await getSessionUser({ as: url.searchParams.get("as") ?? undefined });

  const garmentList = await db
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
    .orderBy(schema.garments.createdAt);

  return Response.json(garmentList);
}
