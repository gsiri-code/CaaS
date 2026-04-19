import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { db } from "@/db";
import { garments, garmentPhotos, photos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { emitIngest } from "./events";
import { containsClothing } from "./filter";
import { extractGarments, type ExtractedGarment } from "./extract";
import { cropGarment, embedCrop, embedDescription } from "./embed";
import { findDuplicate, attachPhotoToGarment } from "./dedup";
import { cropPath, cropPublicUrl, writeBytes } from "./storage";

const BATCH_SIZE = 5; // photos per Gemini extraction call
const FILTER_CONCURRENCY = 4;

export type WorkerPhoto = {
  id: string;
  absPath: string;
  mimeType: string;
};

export async function processBatch(batchId: string, userId: string, items: WorkerPhoto[]) {
  try {
    const accepted: WorkerPhoto[] = [];

    await parallelMap(items, FILTER_CONCURRENCY, async (p) => {
      const bytes = await readFile(p.absPath);
      const keep = await containsClothing(bytes, p.mimeType);
      if (keep) {
        accepted.push(p);
        emitIngest(batchId, { type: "photo_accepted", batchId, photoId: p.id });
      } else {
        await db.update(photos).set({ processed: true }).where(eq(photos.id, p.id));
        emitIngest(batchId, {
          type: "photo_skipped",
          batchId,
          photoId: p.id,
          reason: "no_clothing",
        });
      }
    });

    let photosDone = 0;
    let garmentsTotal = 0;

    for (let i = 0; i < accepted.length; i += BATCH_SIZE) {
      const slice = accepted.slice(i, i + BATCH_SIZE);
      const loaded = await Promise.all(
        slice.map(async (p) => ({ ...p, bytes: await readFile(p.absPath) })),
      );

      let extracted: ExtractedGarment[] = [];
      try {
        extracted = await extractGarments(
          loaded.map((p) => ({ bytes: p.bytes, mimeType: p.mimeType })),
        );
      } catch (err) {
        console.error(`[ingest ${batchId}] extract failed for slice:`, err);
      }

      const byPhoto = new Map<number, ExtractedGarment[]>();
      for (const g of extracted) {
        const list = byPhoto.get(g.photo_index) ?? [];
        list.push(g);
        byPhoto.set(g.photo_index, list);
      }

      for (let j = 0; j < loaded.length; j++) {
        const photo = loaded[j];
        const photoGarments = byPhoto.get(j) ?? [];
        let madeForThisPhoto = 0;

        for (const g of photoGarments) {
          try {
            const cropped = await cropGarment(photo.bytes, g.bbox);
            const cropId = randomUUID();
            const cropAbs = cropPath(batchId, cropId);
            await writeBytes(cropAbs, cropped.bytes);
            const cropUrl = cropPublicUrl(batchId, cropId);

            const imageVec = await embedCrop(cropped.bytes);
            const dup = await findDuplicate({
              userId,
              category: g.category,
              embedding: imageVec,
            });

            if (dup) {
              await attachPhotoToGarment({
                garmentId: dup.garmentId,
                photoId: photo.id,
                bbox: g.bbox,
                extractionConfidence: g.confidence,
                newCropUrl: cropUrl,
                newCropBeatsHero: false,
              });
              emitIngest(batchId, {
                type: "garment_merged",
                batchId,
                garmentId: dup.garmentId,
              });
            } else {
              const textVec = await embedDescription(g.description);
              const [row] = await db
                .insert(garments)
                .values({
                  userId,
                  category: g.category,
                  subcategory: g.subcategory ?? null,
                  colorPrimary: g.color_primary,
                  colorSecondary: g.color_secondary ?? null,
                  pattern: g.pattern,
                  silhouette: g.silhouette,
                  brandGuess: g.brand_guess ?? null,
                  brandConfidence: g.brand_confidence ?? 0,
                  description: g.description,
                  heroImageUrl: cropUrl,
                  imageEmbedding: imageVec,
                  textEmbedding: textVec,
                })
                .returning({ id: garments.id });

              await db.insert(garmentPhotos).values({
                garmentId: row.id,
                photoId: photo.id,
                cropBbox: g.bbox,
                extractionConfidence: g.confidence,
              });

              garmentsTotal += 1;
              madeForThisPhoto += 1;
              emitIngest(batchId, {
                type: "garment_created",
                batchId,
                garmentId: row.id,
                category: g.category,
                heroUrl: cropUrl,
                brandGuess: g.brand_guess ?? null,
              });
            }
          } catch (err) {
            console.error(`[ingest ${batchId}] per-garment failure:`, err);
          }
        }

        await db.update(photos).set({ processed: true }).where(eq(photos.id, photo.id));
        photosDone += 1;
        emitIngest(batchId, {
          type: "photo_processed",
          batchId,
          photoId: photo.id,
          garmentCount: madeForThisPhoto,
        });
        emitIngest(batchId, {
          type: "batch_progress",
          batchId,
          photosDone,
          photosTotal: accepted.length,
          garmentsTotal,
        });
      }
    }

    emitIngest(batchId, { type: "batch_complete", batchId });
  } catch (err) {
    console.error(`[ingest ${batchId}] fatal:`, err);
    emitIngest(batchId, {
      type: "batch_error",
      batchId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function parallelMap<T>(items: T[], concurrency: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
    }
  });
  await Promise.all(workers);
}
