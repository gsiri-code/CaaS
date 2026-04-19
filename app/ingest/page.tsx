import { getSessionUser } from "@/lib/session";
import IngestClient from "./ingest-client";

export default async function IngestPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser(sp);
  return <IngestClient as={user.key} />;
}
