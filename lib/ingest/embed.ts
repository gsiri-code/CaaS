import sharp from "sharp";
import { embedImage, FASHIONCLIP_DIMS } from "@/lib/clients/fashionclip";
import { embedText, GEMINI_EMBED_DIMS } from "@/lib/clients/gemini";

export type CropResult = {
  bytes: Buffer;
  width: number;
  height: number;
};

// bbox is normalized [0,1]. Returns a JPEG buffer of the tight crop (RGB).
export async function cropGarment(
  sourceBytes: Buffer,
  bbox: { x: number; y: number; w: number; h: number },
): Promise<CropResult> {
  const img = sharp(sourceBytes, { failOnError: false }).rotate();
  const meta = await img.metadata();
  if (!meta.width || !meta.height) throw new Error("cannot read image dimensions");

  const x = Math.max(0, Math.round(bbox.x * meta.width));
  const y = Math.max(0, Math.round(bbox.y * meta.height));
  const w = Math.max(1, Math.min(meta.width - x, Math.round(bbox.w * meta.width)));
  const h = Math.max(1, Math.min(meta.height - y, Math.round(bbox.h * meta.height)));

  const bytes = await img
    .extract({ left: x, top: y, width: w, height: h })
    .flatten({ background: "#ffffff" })
    .toColorspace("srgb")
    .jpeg({ quality: 88 })
    .toBuffer();

  return { bytes, width: w, height: h };
}

export async function embedCrop(publicUrl: string): Promise<number[]> {
  const absUrl = publicUrl.startsWith("http")
    ? publicUrl
    : `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}${publicUrl}`;
  const vec = await embedImage(absUrl);
  if (vec.length !== FASHIONCLIP_DIMS) {
    throw new Error(
      `FashionCLIP returned ${vec.length} dims, schema expects ${FASHIONCLIP_DIMS}`,
    );
  }
  return vec;
}

export async function embedDescription(text: string): Promise<number[]> {
  const vec = await embedText(text);
  if (vec.length !== GEMINI_EMBED_DIMS) {
    throw new Error(
      `Gemini embedding returned ${vec.length} dims, schema expects ${GEMINI_EMBED_DIMS}`,
    );
  }
  return vec;
}
