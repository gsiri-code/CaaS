// FashionCLIP image embeddings via Replicate.
// 512-dim output. Swap model slug if we upgrade to Jina CLIP v2 / Voyage multimodal-3.

// Model slug + version must be set before use. Look up current version at
// https://replicate.com/<model> and paste the hash into REPLICATE_VERSION.
// Candidates: krthr/clip-embeddings (CLIP ViT-L, 768-dim — would require schema change),
// or a FashionCLIP deployment. We target a 512-dim output to match the schema.
const REPLICATE_MODEL = process.env.REPLICATE_FASHIONCLIP_MODEL ?? "";
const REPLICATE_VERSION = process.env.REPLICATE_FASHIONCLIP_VERSION ?? "";

export const FASHIONCLIP_DIMS = 512;

type ReplicatePrediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: { embedding: number[] } | number[];
  error?: string;
  urls: { get: string };
};

function token(): string {
  const t = process.env.REPLICATE_API_TOKEN;
  if (!t || t.startsWith("placeholder")) {
    throw new Error("REPLICATE_API_TOKEN is not set");
  }
  return t;
}

async function poll(url: string): Promise<ReplicatePrediction> {
  const t = token();
  for (let i = 0; i < 60; i++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${t}` } });
    const p = (await res.json()) as ReplicatePrediction;
    if (p.status === "succeeded" || p.status === "failed" || p.status === "canceled") return p;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Replicate prediction timed out");
}

export async function embedImage(imageUrl: string): Promise<number[]> {
  if (!REPLICATE_VERSION) {
    throw new Error(
      "REPLICATE_FASHIONCLIP_VERSION is not set — pick a model on Replicate and paste its version hash",
    );
  }
  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: REPLICATE_VERSION,
      input: { image: imageUrl },
    }),
  });
  if (!res.ok) throw new Error(`Replicate create failed: ${res.status} ${await res.text()}`);
  const created = (await res.json()) as ReplicatePrediction;
  const done = await poll(created.urls.get);
  if (done.status !== "succeeded") throw new Error(`Replicate failed: ${done.error ?? done.status}`);
  const out = done.output;
  if (Array.isArray(out)) return out;
  if (out && Array.isArray(out.embedding)) return out.embedding;
  throw new Error("Replicate returned unexpected shape");
}
