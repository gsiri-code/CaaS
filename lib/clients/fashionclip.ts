// FashionCLIP image embeddings via a local Python service.
// Run: `uvicorn fashionclip_service:app --port 8001` (see README for the service).
// Model: patrickjohncyh/fashion-clip (CLIP ViT-B/32 fine-tune) → 512-dim.

export const FASHIONCLIP_DIMS = 512;

const ENDPOINT = process.env.FASHIONCLIP_URL ?? "http://localhost:8001";

type EmbedResponse = { embedding: number[] };

export async function embedImage(bytes: Buffer): Promise<number[]> {
  const res = await fetch(`${ENDPOINT}/embed/image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: bytes.toString("base64") }),
  });
  if (!res.ok) {
    throw new Error(`FashionCLIP ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as EmbedResponse;
  if (!Array.isArray(data.embedding)) throw new Error("FashionCLIP returned unexpected shape");
  return data.embedding;
}

export async function embedTextClip(text: string): Promise<number[]> {
  const res = await fetch(`${ENDPOINT}/embed/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw new Error(`FashionCLIP ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as EmbedResponse;
  if (!Array.isArray(data.embedding)) throw new Error("FashionCLIP returned unexpected shape");
  return data.embedding;
}
