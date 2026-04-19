export const DEMO_USERS = {
  alice: {
    key: "alice",
    id: "11111111-1111-4111-8111-111111111111",
    name: "Brian",
    email: "brian@demo.caas",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80",
  },
  bob: {
    key: "bob",
    id: "22222222-2222-4222-8222-222222222222",
    name: "George",
    email: "george@demo.caas",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
  },
} as const;

export type DemoUserKey = keyof typeof DEMO_USERS;
export type DemoUser = (typeof DEMO_USERS)[DemoUserKey];

export const DEMO_USER_KEYS = Object.keys(DEMO_USERS) as DemoUserKey[];

export function getDemoUserById(id: string): DemoUser | null {
  return Object.values(DEMO_USERS).find((user) => user.id === id) ?? null;
}

export function isDemoUserKey(v: string | undefined | null): v is DemoUserKey {
  return v === "alice" || v === "bob";
}

export function getDemoUser(key: DemoUserKey): DemoUser {
  return DEMO_USERS[key];
}

export function getOtherDemoUser(key: DemoUserKey): DemoUser {
  return DEMO_USERS[key === "alice" ? "bob" : "alice"];
}

