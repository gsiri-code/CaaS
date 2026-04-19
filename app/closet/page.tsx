import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { garments } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { CATEGORIES } from "@/lib/ingest/extract";
import ClosetGrid from "./closet-grid";

export const dynamic = "force-dynamic";

export default async function ClosetPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser(sp);

  const conds = [eq(garments.userId, user.id)];
  if (sp.category) conds.push(eq(garments.category, sp.category));

  const rows = await db
    .select({
      id: garments.id,
      category: garments.category,
      subcategory: garments.subcategory,
      colorPrimary: garments.colorPrimary,
      pattern: garments.pattern,
      brandGuess: garments.brandGuess,
      heroImageUrl: garments.heroImageUrl,
      vault: garments.vault,
    })
    .from(garments)
    .where(and(...conds))
    .orderBy(desc(garments.createdAt));

  const asParam = sp.as ? `as=${sp.as}` : "";
  const qs = (extra: string) => {
    const parts = [asParam, extra].filter(Boolean);
    return parts.length ? `?${parts.join("&")}` : "";
  };

  return (
    <div className="px-6 py-8 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{user.name}&rsquo;s closet</h1>
        <span className="text-sm text-black/60 dark:text-white/60">{rows.length} items</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <Link
          href={`/closet${qs("")}`}
          className={`px-3 py-1 rounded-full border ${
            !sp.category
              ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
              : "border-black/15 dark:border-white/15"
          }`}
        >
          all
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/closet${qs(`category=${c}`)}`}
            className={`px-3 py-1 rounded-full border capitalize ${
              sp.category === c
                ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                : "border-black/15 dark:border-white/15"
            }`}
          >
            {c}
          </Link>
        ))}
      </div>

      <ClosetGrid items={rows} asKey={sp.as ?? ""} />
    </div>
  );
}
