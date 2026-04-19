import { getSessionUser } from "@/lib/session";
import NegotiationsClient from "./negotiations-client";

export default async function NegotiationsPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser(sp);
  return (
    <NegotiationsClient
      userId={user.id}
      userName={user.name}
      as={user.name.toLowerCase() as "alice" | "bob"}
    />
  );
}
