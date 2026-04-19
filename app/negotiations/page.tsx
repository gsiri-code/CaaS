import Link from "next/link";
import { desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { garments, rentalNegotiations, users } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NegotiationsList({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser(sp);

  const rows = await db
    .select({
      id: rentalNegotiations.id,
      status: rentalNegotiations.status,
      requesterId: rentalNegotiations.requesterId,
      ownerId: rentalNegotiations.ownerId,
      priceUsd: rentalNegotiations.agreedPriceUsd,
      turnCount: rentalNegotiations.turnCount,
      createdAt: rentalNegotiations.createdAt,
      garmentId: rentalNegotiations.garmentId,
    })
    .from(rentalNegotiations)
    .where(
      or(eq(rentalNegotiations.requesterId, user.id), eq(rentalNegotiations.ownerId, user.id)),
    )
    .orderBy(desc(rentalNegotiations.createdAt))
    .limit(50);

  // Hydrate user + garment refs
  const userIds = Array.from(new Set(rows.flatMap((r) => [r.requesterId, r.ownerId])));
  const garmentIds = Array.from(new Set(rows.map((r) => r.garmentId)));
  const [userRows, garmentRows] = await Promise.all([
    userIds.length > 0
      ? db.select({ id: users.id, name: users.name }).from(users)
      : Promise.resolve([]),
    garmentIds.length > 0
      ? db
          .select({
            id: garments.id,
            category: garments.category,
            subcategory: garments.subcategory,
            heroImageUrl: garments.heroImageUrl,
          })
          .from(garments)
      : Promise.resolve([]),
  ]);
  const userMap = new Map(userRows.map((u) => [u.id, u.name]));
  const garmentMap = new Map(garmentRows.map((g) => [g.id, g]));

  const asSuffix = sp.as ? `?as=${sp.as}` : "";

  return (
    <div className="px-6 py-8 max-w-5xl">
      <h1 className="text-2xl font-semibold">Negotiations</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Viewing as {user.name} · {rows.length} negotiation{rows.length === 1 ? "" : "s"}
      </p>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-black/60 dark:text-white/60">
          No negotiations yet. Start one from the{" "}
          <Link href={`/wishlist${asSuffix}`} className="underline">
            Wishlist
          </Link>{" "}
          page by requesting a rental.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-black/10 dark:divide-white/10 border-t border-b border-black/10 dark:border-white/10">
          {rows.map((r) => {
            const g = garmentMap.get(r.garmentId);
            const youAreRequester = r.requesterId === user.id;
            const counterparty = userMap.get(youAreRequester ? r.ownerId : r.requesterId) ?? "?";
            return (
              <li key={r.id}>
                <Link
                  href={`/negotiations/${r.id}${asSuffix}`}
                  className="flex items-center gap-3 px-2 py-3 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  {g && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={g.heroImageUrl}
                      alt={g.subcategory ?? g.category}
                      className="h-12 w-12 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 text-sm">
                    <div className="font-medium capitalize">
                      {g?.subcategory ?? g?.category ?? "garment"}{" "}
                      <span className="text-black/50 dark:text-white/50 font-normal">
                        · {youAreRequester ? "you ← " : "you → "}
                        {counterparty}
                      </span>
                    </div>
                    <div className="text-xs text-black/50 dark:text-white/50">
                      {r.turnCount ?? 0} turns · status: {r.status}
                      {r.priceUsd ? ` · $${r.priceUsd}` : ""}
                    </div>
                  </div>
                  <span className="text-xs text-black/40 dark:text-white/40">
                    {new Date(r.createdAt).toLocaleString()}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
