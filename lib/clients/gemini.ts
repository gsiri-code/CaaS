import { GoogleGenerativeAI } from "@google/generative-ai";

let _client: GoogleGenerativeAI | undefined;

function client(): GoogleGenerativeAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    _client = new GoogleGenerativeAI(apiKey);
  }
  return _client;
}

export const GEMINI_VISION_MODEL = "gemini-3-flash-preview";
export const GEMINI_EMBED_MODEL = "gemini-embedding-2-preview";
export const GEMINI_EMBED_DIMS = 768; // Matryoshka truncation from the native 3072.

export function geminiVision() {
  return client().getGenerativeModel({ model: GEMINI_VISION_MODEL });
}

export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      outputDimensionality: GEMINI_EMBED_DIMS,
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini embedContent ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { embedding?: { values?: number[] } };
  const values = data.embedding?.values;
  if (!Array.isArray(values)) throw new Error("Gemini embedContent returned no values");
  return values;
}
