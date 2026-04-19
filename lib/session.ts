import { cookies } from "next/headers";
import { getDemoUser, isDemoUserKey, type DemoUser, type DemoUserKey } from "./demo-users";
import { ensureDemoUsers } from "@/db";

const COOKIE = "caas_as";
export type SessionSearchParams = {
  as?: string | string[] | undefined;
};

export async function getSessionUser(searchParams?: SessionSearchParams): Promise<DemoUser> {
  await ensureDemoUsers();
  const key = await resolveUserKey(searchParams);
  return getDemoUser(key);
}

export async function resolveUserKey(searchParams?: SessionSearchParams): Promise<DemoUserKey> {
  const raw = Array.isArray(searchParams?.as) ? searchParams?.as[0] : searchParams?.as;
  if (isDemoUserKey(raw)) return raw;
  const store = await cookies();
  const fromCookie = store.get(COOKIE)?.value;
  if (isDemoUserKey(fromCookie)) return fromCookie;
  return "alice";
}

export type { DemoUser, DemoUserKey } from "./demo-users";
export const SESSION_COOKIE = COOKIE;
