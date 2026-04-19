import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users, friendships } from "@/db/schema";
import { DEMO_USERS } from "@/lib/demo-users";

async function main() {
  // Upsert demo users with their stable UUIDs so all FK references resolve
  for (const u of Object.values(DEMO_USERS)) {
    await db
      .insert(users)
      .values({
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: { name: u.name, email: u.email, avatarUrl: u.avatarUrl },
      });
  }

  // Ensure Brian and George are friends
  const [a, b] = [DEMO_USERS.alice.id, DEMO_USERS.bob.id].sort();
  await db
    .insert(friendships)
    .values({ userAId: a, userBId: b })
    .onConflictDoNothing();

  const count = await db.execute(sql`SELECT COUNT(*)::int AS n FROM users`);
  console.log("users in db:", count);

  // Verify the seeded users
  const seeded = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users);
  for (const u of seeded) {
    console.log(`  ${u.name} (${u.email}) → ${u.id}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
