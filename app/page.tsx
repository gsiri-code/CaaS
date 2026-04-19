import { redirect } from "next/navigation";
import { resolveUserKey } from "@/lib/session";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ as?: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const as = await resolveUserKey(sp);
  redirect(`/ingest?as=${as}`);
}
