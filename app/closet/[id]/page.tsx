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
      <div className="px-6 py-8">
        <p className="text-sm">This garment belongs to a different user.</p>
        <Link href="/closet" className="underline text-sm">back to closet</Link>
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

  const backHref = sp.as ? `/closet?as=${sp.as}` : "/closet";

  return (
    <div className="px-6 py-8 max-w-5xl">
      <Link href={backHref} className="text-xs underline text-black/60 dark:text-white/60">
        ← back to closet
      </Link>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={row.heroImageUrl}
            alt={row.description}
            className="w-full rounded border border-black/10 dark:border-white/10"
          />
          {contributors.length > 0 && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wider text-black/50 dark:text-white/50 mb-2">
                contributing photos ({contributors.length})
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {contributors.map((c) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={c.id}
                    src={c.photoUrl}
                    alt=""
                    className="w-full aspect-square object-cover rounded border border-black/10 dark:border-white/10"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

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
          asKey={sp.as ?? ""}
        />
      </div>
    </div>
  );
}
