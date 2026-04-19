export const DEMO_USERS = {
  alice: {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Alice",
    email: "alice@demo.caas",
  },
  bob: {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Bob",
    email: "bob@demo.caas",
  },
} as const;

export type DemoUserKey = keyof typeof DEMO_USERS;
export type DemoUser = (typeof DEMO_USERS)[DemoUserKey];

export function isDemoUserKey(v: string | undefined | null): v is DemoUserKey {
  return v === "alice" || v === "bob";
}
