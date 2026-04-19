import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type PgClient = ReturnType<typeof postgres>;
type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForPg = globalThis as unknown as { _caasPg?: PgClient; _caasDb?: Db };

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function getClient(): PgClient {
  if (globalForPg._caasPg) return globalForPg._caasPg;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = postgres(connectionString, { prepare: false });
  if (process.env.NODE_ENV !== "production") globalForPg._caasPg = client;
  return client;
}

export const db: Db = new Proxy({} as Db, {
  get(_t, prop) {
    if (!globalForPg._caasDb) globalForPg._caasDb = drizzle(getClient(), { schema });
    const instance = globalForPg._caasDb as unknown as Record<string | symbol, unknown>;
    return instance[prop as string];
  },
});

export { schema };
