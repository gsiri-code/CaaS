import { cookies } from "next/headers";
import { DEMO_USERS, isDemoUserKey, type DemoUser, type DemoUserKey } from "./demo-users";

const COOKIE = "caas_as";

export async function getSessionUser(searchParams?: {
  as?: string | string[] | undefined;
}): Promise<DemoUser> {
  const key = await resolveUserKey(searchParams);
  return DEMO_USERS[key];
}

export async function resolveUserKey(searchParams?: {
  as?: string | string[] | undefined;
}): Promise<DemoUserKey> {
  const raw = Array.isArray(searchParams?.as) ? searchParams?.as[0] : searchParams?.as;
  if (isDemoUserKey(raw)) return raw;
  const store = await cookies();
  const fromCookie = store.get(COOKIE)?.value;
  if (isDemoUserKey(fromCookie)) return fromCookie;
  return "alice";
}

export const SESSION_COOKIE = COOKIE;
