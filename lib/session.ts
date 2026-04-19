import { cookies } from "next/headers";
import { DEMO_USERS, isDemoUserKey, type DemoUser, type DemoUserKey } from "./demo-users";

const COOKIE = "caas_as";
const MOCK_VALUES = new Set(["1", "true", "yes", "on"]);

function isTruthyEnv(value: string | undefined) {
  return MOCK_VALUES.has((value ?? "").toLowerCase());
}

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

export function shouldUseMockData() {
  return isTruthyEnv(process.env.CAAS_USE_MOCK_DATA)
    || isTruthyEnv(process.env.NEXT_PUBLIC_USE_MOCK_DATA)
    || isTruthyEnv(process.env.MOCK_MODE);
}

export function shouldUseMockDataForUser(user: Pick<DemoUser, "mockData">) {
  return shouldUseMockData() || user.mockData;
}

export type { DemoUser, DemoUserKey } from "./demo-users";
export const SESSION_COOKIE = COOKIE;
