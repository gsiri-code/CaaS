import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { sql } from "drizzle-orm";
import { db } from "@/db";

async function main() {
  const extRows = await db.execute(
    sql`SELECT extname FROM pg_extension WHERE extname = 'vector'`,
  );
  if (extRows.length === 0) {
    throw new Error("vector extension is not installed");
  }
  console.log("✓ pgvector extension present");

  const distRows = await db.execute(
    sql`SELECT ('[0.1, 0.2, 0.3]'::vector <=> '[0.2, 0.1, 0.4]'::vector) AS d`,
  );
  console.log("✓ cosine distance query result:", distRows);

  const knnRows = await db.execute(sql`
    WITH v(x) AS (
      VALUES ('[1,0,0]'::vector), ('[0.9,0.1,0]'::vector), ('[0,1,0]'::vector)
    )
    SELECT x::text AS v, x <=> '[1,0,0]'::vector AS d
    FROM v
    ORDER BY d
    LIMIT 3
  `);
  console.log("✓ kNN sort result:", knnRows);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
