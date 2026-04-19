import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users, friendships } from "@/db/schema";
import { DEMO_USERS } from "@/lib/demo-users";

async function main() {
  const rows = Object.values(DEMO_USERS).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
  }));

  await db.insert(users).values(rows).onConflictDoNothing();

  const [a, b] = [DEMO_USERS.alice.id, DEMO_USERS.bob.id].sort();
  await db
    .insert(friendships)
    .values({ userAId: a, userBId: b })
    .onConflictDoNothing();

  const count = await db.execute(sql`SELECT COUNT(*)::int AS n FROM users`);
  console.log("users in db:", count);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
