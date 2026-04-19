import { getSessionUser } from "@/lib/session";
import IngestClient from "./ingest-client";

export default async function IngestPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser(sp);
  return (
    <div className="px-6 py-8 max-w-5xl">
      <h1 className="text-2xl font-semibold">Ingest</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Drop a ZIP of photos or multi-select images. Processing as {user.name}.
      </p>
      <IngestClient as={user.name.toLowerCase() as "alice" | "bob"} />
    </div>
  );
}
