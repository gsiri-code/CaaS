import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const user = await getSessionUser({ as: url.searchParams.get("as") ?? undefined });

  const items = await db
    .select({
      id: schema.wishlistItems.id,
      queryText: schema.wishlistItems.queryText,
      referenceImageUrl: schema.wishlistItems.referenceImageUrl,
      maxRentalPriceUsd: schema.wishlistItems.maxRentalPriceUsd,
      createdAt: schema.wishlistItems.createdAt,
    })
    .from(schema.wishlistItems)
    .where(eq(schema.wishlistItems.userId, user.id))
    .orderBy(schema.wishlistItems.createdAt);

  return Response.json(items);
}
