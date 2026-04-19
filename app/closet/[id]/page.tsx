import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { garments, garmentPhotos, photos } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import GarmentEditor from "./garment-editor";

export const dynamic = "force-dynamic";

export default async function GarmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ as?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await getSessionUser(sp);

  const [row] = await db.select().from(garments).where(eq(garments.id, id));
  if (!row) notFound();
  if (row.userId !== user.id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center animate-fade-up">
        <p className="section-header text-[26px]" style={{ color: "var(--muted)" }}>
          Not yours
        </p>
        <p className="text-[13px] mt-3" style={{ color: "var(--muted)" }}>
          This garment belongs to a different user.
        </p>
        <Link
          href={`/closet?as=${user.key}`}
          className="mt-5 btn-secondary inline-flex items-center justify-center no-underline !h-11 !px-6 !text-[13px]"
        >
          Back to closet
        </Link>
      </div>
    );
  }

  const contributors = await db
    .select({
      id: garmentPhotos.id,
      photoUrl: photos.fileUrl,
      cropBbox: garmentPhotos.cropBbox,
      extractionConfidence: garmentPhotos.extractionConfidence,
    })
    .from(garmentPhotos)
    .innerJoin(photos, eq(photos.id, garmentPhotos.photoId))
    .where(eq(garmentPhotos.garmentId, id));

  const backHref = `/closet?as=${user.key}`;

  return (
    <div className="min-h-screen flex flex-col pb-32">
      {/* Back nav */}
      <div className="px-6 pt-16 pb-4 flex items-center gap-3 animate-fade-up">
        <Link
          href={backHref}
          className="flex items-center gap-1.5 text-[13px] tracking-wide no-underline transition-opacity hover:opacity-70"
          style={{ color: "var(--muted)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Closet
        </Link>
        <div className="flex-1" />
        <span
          className="label-mono px-3 py-1.5 rounded-full"
          style={{
            background: row.vault ? "var(--accent-soft)" : "var(--surface)",
            color: row.vault ? "var(--accent)" : "var(--muted)",
            fontSize: "10px",
          }}
        >
          {row.vault ? "Vaulted" : "Available"}
        </span>
      </div>

      <div className="px-6 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image column */}
        <div className="animate-fade-up" style={{ animationDelay: "0.05s" }}>
          <div
            className="overflow-hidden rounded-[20px]"
            style={{ boxShadow: "var(--shadow-editorial)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={row.heroImageUrl}
              alt={row.description}
              className="w-full aspect-[4/5] object-cover"
              style={{ background: "var(--surface)" }}
            />
          </div>

          {contributors.length > 0 && (
            <div className="mt-5">
              <p className="label-mono mb-3" style={{ color: "var(--muted)" }}>
                Source photos ({contributors.length})
              </p>
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
                {contributors.map((c, i) => (
                  <div
                    key={c.id}
                    className="flex-shrink-0 overflow-hidden rounded-xl animate-fade-up"
                    style={{ animationDelay: `${0.04 * i}s` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.photoUrl}
                      alt=""
                      className="w-16 h-16 object-cover"
                      style={{ background: "var(--surface-hover)" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Editor column */}
        <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <h1 className="section-header text-[28px] mb-1 capitalize">
            {row.subcategory ?? row.category}
          </h1>
          {row.brandGuess && (
            <p className="text-[13px] tracking-wide mb-6" style={{ color: "var(--muted)" }}>
              {row.brandGuess}
            </p>
          )}
          {!row.brandGuess && <div className="mb-6" />}

          <GarmentEditor
            garment={{
              id: row.id,
              category: row.category,
              subcategory: row.subcategory,
              colorPrimary: row.colorPrimary,
              colorSecondary: row.colorSecondary,
              pattern: row.pattern,
              silhouette: row.silhouette,
              brandGuess: row.brandGuess,
              description: row.description,
              estimatedValueUsd: row.estimatedValueUsd,
              vault: row.vault,
            }}
            asKey={user.key}
          />
        </div>
      </div>
    </div>
  );
}
