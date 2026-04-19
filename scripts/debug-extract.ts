import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { readFile } from "node:fs/promises";
import { geminiVision } from "@/lib/clients/gemini";
import { containsClothing } from "@/lib/ingest/filter";
import { extractGarments } from "@/lib/ingest/extract";

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("usage: bun run scripts/debug-extract.ts <image path>");
    process.exit(1);
  }
  const bytes = await readFile(path);
  const mimeType = path.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";

  console.log("→ raw Gemini filter call");
  const rawRes = await geminiVision().generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: 'Does this image contain visible clothing items being worn by a person, OR a clear flat-lay of garments? Answer strictly "yes" or "no".',
          },
          { inlineData: { mimeType, data: bytes.toString("base64") } },
        ],
      },
    ],
    generationConfig: { temperature: 0, maxOutputTokens: 4 },
  });
  const raw = rawRes.response.text();
  console.log("  raw text:", JSON.stringify(raw));
  console.log("  finishReason:", rawRes.response.candidates?.[0]?.finishReason);

  console.log("→ filter (containsClothing)");
  const keep = await containsClothing(bytes, mimeType);
  console.log("  result:", keep);

  console.log("→ extract (extractGarments, single photo)");
  const extracted = await extractGarments([{ bytes, mimeType }]);
  console.log(`  ${extracted.length} garment(s):`);
  for (const g of extracted) {
    console.log(
      `   - ${g.category}/${g.subcategory ?? "?"} ${g.color_primary} ` +
        `conf=${g.confidence.toFixed(2)} — ${g.description}`,
    );
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
