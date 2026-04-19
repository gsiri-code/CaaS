import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { readFile } from "node:fs/promises";
import { embedCrop, embedDescription } from "@/lib/ingest/embed";

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("usage: bun run scripts/debug-embed.ts <crop path>");
    process.exit(1);
  }

  console.log("→ FashionCLIP image embedding");
  const bytes = await readFile(path);
  const imageVec = await embedCrop(bytes);
  console.log(`  ${imageVec.length}-dim, first 3: ${imageVec.slice(0, 3).join(", ")}`);

  console.log("→ Gemini text embedding");
  const textVec = await embedDescription("cream corduroy blazer with two buttons");
  console.log(`  ${textVec.length}-dim, first 3: ${textVec.slice(0, 3).join(", ")}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
