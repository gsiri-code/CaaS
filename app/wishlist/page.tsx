import { getSessionUser } from "@/lib/session";
import { getFriendIds } from "@/lib/friends";
import WishlistClient from "./wishlist-client";

export const dynamic = "force-dynamic";

export default async function WishlistPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser(sp);
  const friendIds = await getFriendIds(user.id);

  return (
    <div className="px-6 py-8 max-w-5xl">
      <h1 className="text-2xl font-semibold">Wishlist</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Browsing as {user.name} · {friendIds.length} friend{friendIds.length === 1 ? "" : "s"} in graph.
      </p>
      <WishlistClient asKey={user.name.toLowerCase() as "alice" | "bob"} />
    </div>
  );
}
