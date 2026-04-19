import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { DEMO_USERS } from "@/lib/demo-users";

type PgClient = ReturnType<typeof postgres>;
type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForPg = globalThis as unknown as {
  _caasPg?: PgClient;
  _caasDb?: Db;
  _caasSeeded?: boolean;
};

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

/**
 * Ensure demo users (Brian & George) exist in the DB.
 * Runs once per server lifecycle; subsequent calls are no-ops.
 */
export async function ensureDemoUsers() {
  if (globalForPg._caasSeeded || !isDatabaseConfigured()) return;
  globalForPg._caasSeeded = true;

  for (const u of Object.values(DEMO_USERS)) {
    await db
      .insert(schema.users)
      .values({ id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl })
      .onConflictDoNothing();
  }

  // Ensure they are friends
  const [a, b] = [DEMO_USERS.alice.id, DEMO_USERS.bob.id].sort();
  await db
    .insert(schema.friendships)
    .values({ userAId: a, userBId: b })
    .onConflictDoNothing();
}

export { schema };
