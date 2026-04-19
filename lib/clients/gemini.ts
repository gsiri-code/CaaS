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

export const GEMINI_VISION_MODEL = "gemini-2.5-flash";
export const GEMINI_EMBED_MODEL = "text-embedding-004";
export const GEMINI_EMBED_DIMS = 768;

export function geminiVision() {
  return client().getGenerativeModel({ model: GEMINI_VISION_MODEL });
}

export function geminiEmbed() {
  return client().getGenerativeModel({ model: GEMINI_EMBED_MODEL });
}

export async function embedText(text: string): Promise<number[]> {
  const res = await geminiEmbed().embedContent(text);
  return res.embedding.values;
}
