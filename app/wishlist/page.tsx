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
    <div className="min-h-screen flex flex-col pb-32">
      <div className="px-6 pt-20 pb-2 animate-fade-up">
        <p className="overline mb-4">Discover</p>
        <h1 className="section-header text-[36px]">
          Find Your Next Look
        </h1>
        <p
          className="mt-3 text-[14px] tracking-wide"
          style={{ color: "var(--muted)" }}
        >
          Browsing as {user.name} &middot; {friendIds.length} friend{friendIds.length === 1 ? "" : "s"} in your circle
        </p>
      </div>
      <WishlistClient asKey={user.key} />
    </div>
  );
}
