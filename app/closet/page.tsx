import { getSessionUser } from "@/lib/session";
import ClosetClient from "./closet-client";

export default async function ClosetPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser(sp);
  return <ClosetClient userName={user.name} as={user.name.toLowerCase() as "alice" | "bob"} />;
}
