import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const PUBLIC_DIR = path.join(process.cwd(), "public", "uploads");

export const PHOTOS_SUBDIR = "photos";
export const CROPS_SUBDIR = "crops";

export async function ensureBatchDirs(batchId: string) {
  const photosDir = path.join(PUBLIC_DIR, PHOTOS_SUBDIR, batchId);
  const cropsDir = path.join(PUBLIC_DIR, CROPS_SUBDIR, batchId);
  await mkdir(photosDir, { recursive: true });
  await mkdir(cropsDir, { recursive: true });
  return { photosDir, cropsDir };
}

export function photoPath(batchId: string, photoId: string, ext: string) {
  return path.join(PUBLIC_DIR, PHOTOS_SUBDIR, batchId, `${photoId}${ext}`);
}

export function cropPath(batchId: string, cropId: string) {
  return path.join(PUBLIC_DIR, CROPS_SUBDIR, batchId, `${cropId}.jpg`);
}

export function photoPublicUrl(batchId: string, photoId: string, ext: string) {
  return `/uploads/${PHOTOS_SUBDIR}/${batchId}/${photoId}${ext}`;
}

export function cropPublicUrl(batchId: string, cropId: string) {
  return `/uploads/${CROPS_SUBDIR}/${batchId}/${cropId}.jpg`;
}

export async function writeBytes(absPath: string, bytes: Buffer) {
  await writeFile(absPath, bytes);
}
