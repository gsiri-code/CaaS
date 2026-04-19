import { randomUUID } from "node:crypto";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { NextRequest, NextResponse } from "next/server";
import AdmZip from "adm-zip";
import { db, isDatabaseConfigured } from "@/db";
import { photos } from "@/db/schema";
import { createBus } from "@/lib/ingest/events";
import { ensureBatchDirs, photoPath, photoPublicUrl } from "@/lib/ingest/storage";
import { processBatch, type WorkerPhoto } from "@/lib/ingest/worker";
import { getSessionUser, type DemoUserKey } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 300;

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]);
const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const asParam = form.get("as");
  const user = await getSessionUser({ as: typeof asParam === "string" ? asParam : undefined });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 500 });
  }

  const realBatch = await createRealIngestBatch(form, user.key, user.id);
  return NextResponse.json(realBatch);
}

export async function createRealIngestBatch(form: FormData, asKey: DemoUserKey, userId: string) {
  const batchId = randomUUID();
  const { photosDir } = await ensureBatchDirs(batchId);
  const accepted: WorkerPhoto[] = [];

  for (const value of form.getAll("files")) {
    if (!(value instanceof File)) continue;
    const name = value.name.toLowerCase();
    if (name.endsWith(".zip")) {
      await extractZip(value, photosDir, userId, batchId, accepted);
    } else {
      await saveSingle(value, photosDir, userId, batchId, accepted);
    }
  }

  if (accepted.length === 0) {
    throw new Error("no valid image files in upload");
  }

  createBus(batchId);
  void processBatch(batchId, userId, accepted);

  return { batch_id: batchId, accepted: accepted.length };
}

async function saveSingle(
  file: File,
  photosDir: string,
  userId: string,
  batchId: string,
  accepted: WorkerPhoto[],
) {
  const ext = path.extname(file.name).toLowerCase();
  if (!IMAGE_EXTS.has(ext)) return;
  const bytes = Buffer.from(await file.arrayBuffer());
  await insertAndStage(bytes, ext, photosDir, userId, batchId, accepted);
}

async function extractZip(
  zipFile: File,
  photosDir: string,
  userId: string,
  batchId: string,
  accepted: WorkerPhoto[],
) {
  const buf = Buffer.from(await zipFile.arrayBuffer());
  const zip = new AdmZip(buf);
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const entryName = entry.entryName;
    if (entryName.includes("__MACOSX/") || path.basename(entryName).startsWith("._")) continue;
    const ext = path.extname(entryName).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) continue;
    const bytes = entry.getData();
    await insertAndStage(bytes, ext, photosDir, userId, batchId, accepted);
  }
}

async function insertAndStage(
  bytes: Buffer,
  ext: string,
  photosDir: string,
  userId: string,
  batchId: string,
  accepted: WorkerPhoto[],
) {
  const photoId = randomUUID();
  const abs = photoPath(batchId, photoId, ext);
  await writeBytesTo(abs, bytes);
  const fileUrl = photoPublicUrl(batchId, photoId, ext);
  await db.insert(photos).values({
    id: photoId,
    userId,
    fileUrl,
  });
  accepted.push({
    id: photoId,
    absPath: abs,
    mimeType: MIME_BY_EXT[ext] ?? "application/octet-stream",
  });
}

async function writeBytesTo(absPath: string, bytes: Buffer) {
  await pipeline(Readable.from(bytes), createWriteStream(absPath));
}
