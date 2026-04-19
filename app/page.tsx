import { getSessionUser } from "@/lib/session";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser(sp);

  return (
    <div className="px-6 py-10 max-w-3xl">
      <h1 className="text-2xl font-semibold">Hello, {user.name}.</h1>
      <p className="mt-2 text-sm text-black/60 dark:text-white/60">
        Session id: <code className="font-mono">{user.id}</code>
      </p>
      <p className="mt-6 text-sm">
        Phase 1 scaffold. Nav links above are stubs — each page lights up in its own phase.
      </p>
    </div>
  );
}
