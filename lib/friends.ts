import { or, eq } from "drizzle-orm";
import { db } from "@/db";
import { friendships, users } from "@/db/schema";

export async function getFriendIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ a: friendships.userAId, b: friendships.userBId })
    .from(friendships)
    .where(or(eq(friendships.userAId, userId), eq(friendships.userBId, userId)));
  const ids = new Set<string>();
  for (const r of rows) ids.add(r.a === userId ? r.b : r.a);
  return Array.from(ids);
}

export async function getUsersById(ids: string[]) {
  if (ids.length === 0) return new Map<string, { id: string; name: string; email: string }>();
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users);
  const byId = new Map(rows.map((u) => [u.id, u]));
  const out = new Map<string, { id: string; name: string; email: string }>();
  for (const id of ids) {
    const u = byId.get(id);
    if (u) out.set(id, u);
  }
  return out;
}
