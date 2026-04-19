import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { listClosetGarments } from "@/lib/app-data";
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

  const garments = await listClosetGarments(user);
  const rows = sp.category
    ? garments.filter((garment) => garment.category === sp.category)
    : garments;

  const asParam = `as=${user.key}`;
  const qs = (extra: string) => {
    const parts = [asParam, extra].filter(Boolean);
    return `?${parts.join("&")}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Editorial header */}
      <div className="px-6 pt-20 pb-2 animate-fade-up">
        <p className="overline mb-4">Wardrobe</p>
        <h1 className="section-header text-[36px]">
          {user.name}&rsquo;s Closet
        </h1>
        <p
          className="mt-3 text-[14px] tracking-wide"
          style={{ color: "var(--muted)" }}
        >
          {rows.length} piece{rows.length === 1 ? "" : "s"} curated
        </p>
      </div>

      {/* Category filters */}
      <div
        className="px-6 pt-5 pb-2 flex gap-2 overflow-x-auto no-scrollbar animate-fade-up"
        style={{ animationDelay: "0.08s" }}
      >
        <Link
          href={`/closet${qs("")}`}
          className={`tag-pill whitespace-nowrap no-underline ${
            !sp.category ? "tag-pill-active" : ""
          }`}
        >
          All
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/closet${qs(`category=${c}`)}`}
            className={`tag-pill whitespace-nowrap no-underline capitalize ${
              sp.category === c ? "tag-pill-active" : ""
            }`}
          >
            {c}
          </Link>
        ))}
      </div>

      <div className="px-6 pt-4 pb-32">
        <ClosetGrid items={rows} asKey={user.key} />
      </div>
    </div>
  );
}
