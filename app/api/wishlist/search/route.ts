import { searchWishlistItems } from "@/lib/app-data";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const url = new URL(req.url);
  const user = await getSessionUser({ as: url.searchParams.get("as") ?? undefined });
  const body = await req.json();
  const { queryText, maxPricePerDay } = body as {
    queryText: string;
    maxPricePerDay?: number;
  };

  if (!queryText || typeof queryText !== "string") {
    return Response.json({ error: "queryText required" }, { status: 400 });
  }

  return Response.json(await searchWishlistItems(user, { queryText, maxPricePerDay }));
}
