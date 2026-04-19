import { z } from "zod";
import { SchemaType, type ResponseSchema } from "@google/generative-ai";
import { geminiVision } from "@/lib/clients/gemini";

export const CATEGORIES = [
  "top",
  "bottom",
  "dress",
  "outerwear",
  "shoe",
  "accessory",
] as const;

export const garmentSchema = z.object({
  photo_index: z.number().int().nonnegative(),
  bbox: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().min(0).max(1),
    h: z.number().min(0).max(1),
  }),
  category: z.enum(CATEGORIES),
  subcategory: z.string().nullable().optional(),
  color_primary: z.string(),
  color_secondary: z.string().nullable().optional(),
  pattern: z.string(),
  silhouette: z.string(),
  brand_guess: z.string().nullable().optional(),
  brand_confidence: z.number().min(0).max(1).default(0),
  description: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export type ExtractedGarment = z.infer<typeof garmentSchema>;

const responseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  required: ["garments"],
  properties: {
    garments: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        required: [
          "photo_index",
          "bbox",
          "category",
          "color_primary",
          "pattern",
          "silhouette",
          "description",
          "confidence",
        ],
        properties: {
          photo_index: { type: SchemaType.INTEGER },
          bbox: {
            type: SchemaType.OBJECT,
            required: ["x", "y", "w", "h"],
            properties: {
              x: { type: SchemaType.NUMBER },
              y: { type: SchemaType.NUMBER },
              w: { type: SchemaType.NUMBER },
              h: { type: SchemaType.NUMBER },
            },
          },
          category: {
            type: SchemaType.STRING,
            format: "enum",
            enum: [...CATEGORIES] as string[],
          },
          subcategory: { type: SchemaType.STRING, nullable: true },
          color_primary: { type: SchemaType.STRING },
          color_secondary: { type: SchemaType.STRING, nullable: true },
          pattern: { type: SchemaType.STRING },
          silhouette: { type: SchemaType.STRING },
          brand_guess: { type: SchemaType.STRING, nullable: true },
          brand_confidence: { type: SchemaType.NUMBER },
          description: { type: SchemaType.STRING },
          confidence: { type: SchemaType.NUMBER },
        },
      },
    },
  },
};

const SYSTEM = `You extract structured garment data from personal photos.

For each photo (indexed in the order presented), identify every distinct wearable garment clearly visible. For each garment return:
- photo_index: zero-based index matching the input order
- bbox: tight bounding box in normalized [0,1] coords {x, y, w, h} relative to that photo
- category: one of top | bottom | dress | outerwear | shoe | accessory
- subcategory: specific type (e.g., "cardigan", "midi dress", "ankle boot")
- color_primary / color_secondary: common color names; secondary may be null
- pattern: solid | striped | floral | plaid | graphic | other
- silhouette: short phrase like "fitted midi" or "oversized cropped"
- brand_guess + brand_confidence: null and 0 if unknown
- description: one-sentence natural-language description used for text retrieval
- confidence: 0-1 that this is a real distinct garment

Rules:
- Skip garments that are blurry, truncated, or ambiguous (confidence <0.4 means you should not emit them).
- Prefer false splits to false merges when two items look similar — emit both.
- Do not invent brands. If unsure, brand_guess=null.
- Do not include the person, background, or accessories that are not wearable (e.g., handbags are accessories — include; cars, buildings — exclude).

Examples:

Input: a photo of someone in a cream wool cardigan over a black tee and blue jeans.
Output garments (for photo_index 0):
  {category: "outerwear", subcategory: "cardigan", color_primary: "cream", pattern: "solid", silhouette: "relaxed open-front", description: "Cream relaxed-fit wool cardigan, open front.", confidence: 0.95}
  {category: "top", subcategory: "t-shirt", color_primary: "black", pattern: "solid", silhouette: "fitted crew", description: "Black fitted crew-neck cotton t-shirt.", confidence: 0.9}
  {category: "bottom", subcategory: "jeans", color_primary: "blue", pattern: "solid", silhouette: "straight-leg", description: "Blue straight-leg denim jeans, medium wash.", confidence: 0.92}

Input: a mirror selfie in a red floral midi dress with white sneakers.
Output garments (for photo_index 0):
  {category: "dress", subcategory: "midi", color_primary: "red", color_secondary: "white", pattern: "floral", silhouette: "fit-and-flare midi", description: "Red floral fit-and-flare midi dress with white print.", confidence: 0.96}
  {category: "shoe", subcategory: "sneaker", color_primary: "white", pattern: "solid", silhouette: "low-top lace-up", description: "White low-top leather sneakers.", confidence: 0.88}

Input: a plated meal on a restaurant table.
Output garments: []`;

export async function extractGarments(
  photos: { bytes: Buffer; mimeType: string }[],
): Promise<ExtractedGarment[]> {
  if (photos.length === 0) return [];
  const model = geminiVision();

  const run = async () => {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: SYSTEM },
            { text: `Process ${photos.length} photo(s). Emit strict JSON.` },
            ...photos.map((p) => ({
              inlineData: { mimeType: p.mimeType, data: p.bytes.toString("base64") },
            })),
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema,
      },
    });
    const raw = result.response.text();
    const parsed = JSON.parse(raw) as { garments: unknown[] };
    return parsed.garments ?? [];
  };

  let rawGarments: unknown[];
  try {
    rawGarments = await run();
  } catch (err) {
    console.warn("gemini extract failed, retrying once:", err);
    rawGarments = await run();
  }

  const out: ExtractedGarment[] = [];
  for (const g of rawGarments) {
    const res = garmentSchema.safeParse(g);
    if (!res.success) continue;
    if (res.data.confidence < 0.4) continue;
    if (res.data.photo_index >= photos.length) continue;
    out.push(res.data);
  }
  return out;
}
