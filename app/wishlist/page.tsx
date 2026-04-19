import { getSessionUser } from "@/lib/session";
import WishlistClient from "./wishlist-client";

export default async function WishlistPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser(sp);
  return <WishlistClient as={user.name.toLowerCase() as "alice" | "bob"} />;
}
