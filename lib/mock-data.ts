import { randomUUID } from "node:crypto";
import { DEMO_USERS, type DemoUser, type DemoUserKey } from "@/lib/demo-users";

export type MockPhoto = {
  id: string;
  photoId: string;
  fileUrl: string;
  cropBbox: { x: number; y: number; w: number; h: number } | null;
};

export type MockGarment = {
  id: string;
  userId: string;
  category: string;
  subcategory: string | null;
  colorPrimary: string | null;
  colorSecondary: string | null;
  pattern: string | null;
  silhouette: string | null;
  brandGuess: string | null;
  description: string;
  heroImageUrl: string;
  wearCount: number;
  lastWornAt: string | null;
  estimatedValueUsd: number | null;
  vault: boolean;
  createdAt: string;
  photos: MockPhoto[];
};

export type MockNegotiationMessage = {
  id: string;
  speaker: string;
  content: string;
  toolCall: { name: string; result?: string } | null;
  createdAt: string;
};

export type MockNegotiation = {
  id: string;
  requesterId: string;
  ownerId: string;
  garmentId: string;
  status: string;
  agreedPriceUsd: number | null;
  agreedHandoff: { type: string; datetime?: string; location?: string } | null;
  turnCount: number;
  createdAt: string;
  closedAt: string | null;
  messages: MockNegotiationMessage[];
};

type MockState = {
  garments: MockGarment[];
  negotiations: MockNegotiation[];
};

const now = Date.now();
const day = 24 * 60 * 60 * 1000;

const photo = (id: string, url: string): MockPhoto => ({
  id: `${id}-photo-link`,
  photoId: `${id}-photo`,
  fileUrl: url,
  cropBbox: null,
});

const seedGarments: MockGarment[] = [
  {
    id: "g-alice-1",
    userId: DEMO_USERS.alice.id,
    category: "Dress",
    subcategory: "Black Satin Midi Dress",
    colorPrimary: "black",
    colorSecondary: null,
    pattern: "solid",
    silhouette: "slip",
    brandGuess: "Reformation",
    description: "Elegant satin midi dress for dinners, weddings, and evening events.",
    heroImageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
    wearCount: 4,
    lastWornAt: new Date(now - 9 * day).toISOString(),
    estimatedValueUsd: 220,
    vault: false,
    createdAt: new Date(now - 40 * day).toISOString(),
    photos: [photo("g-alice-1", "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80")],
  },
  {
    id: "g-alice-2",
    userId: DEMO_USERS.alice.id,
    category: "Outerwear",
    subcategory: "Camel Wool Coat",
    colorPrimary: "camel",
    colorSecondary: null,
    pattern: "solid",
    silhouette: "tailored",
    brandGuess: "Aritzia",
    description: "Structured wool coat with a relaxed fit for cool-weather layering.",
    heroImageUrl: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=80",
    wearCount: 11,
    lastWornAt: new Date(now - 3 * day).toISOString(),
    estimatedValueUsd: 310,
    vault: true,
    createdAt: new Date(now - 26 * day).toISOString(),
    photos: [photo("g-alice-2", "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80")],
  },
  {
    id: "g-bob-1",
    userId: DEMO_USERS.bob.id,
    category: "Dress",
    subcategory: "Navy Evening Slip Dress",
    colorPrimary: "navy",
    colorSecondary: null,
    pattern: "solid",
    silhouette: "slip",
    brandGuess: "Vince",
    description: "Bias-cut evening slip dress with a polished drape and minimal lines.",
    heroImageUrl: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
    wearCount: 2,
    lastWornAt: new Date(now - 14 * day).toISOString(),
    estimatedValueUsd: 240,
    vault: false,
    createdAt: new Date(now - 18 * day).toISOString(),
    photos: [photo("g-bob-1", "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=600&q=80")],
  },
  {
    id: "g-bob-2",
    userId: DEMO_USERS.bob.id,
    category: "Shoes",
    subcategory: "White Leather Sneakers",
    colorPrimary: "white",
    colorSecondary: null,
    pattern: "solid",
    silhouette: "low-top",
    brandGuess: "Common Projects",
    description: "Clean low-top leather sneakers that dress up or down.",
    heroImageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
    wearCount: 19,
    lastWornAt: new Date(now - 1 * day).toISOString(),
    estimatedValueUsd: 180,
    vault: false,
    createdAt: new Date(now - 11 * day).toISOString(),
    photos: [photo("g-bob-2", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80")],
  },
];

const seedNegotiations: MockNegotiation[] = [
  {
    id: "n-1",
    requesterId: DEMO_USERS.alice.id,
    ownerId: DEMO_USERS.bob.id,
    garmentId: "g-bob-1",
    status: "open",
    agreedPriceUsd: 24,
    agreedHandoff: {
      type: "calendar_event",
      datetime: new Date(now + 2 * day).toISOString(),
      location: "SoHo coffee shop",
    },
    turnCount: 5,
    createdAt: new Date(now - 2 * day).toISOString(),
    closedAt: null,
    messages: [
      {
        id: "m-1",
        speaker: "alice",
        content: "Would Bob consider lending this for Saturday night?",
        toolCall: null,
        createdAt: new Date(now - 2 * day).toISOString(),
      },
      {
        id: "m-2",
        speaker: "bob",
        content: "Yes — $24/day works if pickup is easy.",
        toolCall: { name: "calendar.check_availability", result: "available" },
        createdAt: new Date(now - 2 * day + 15 * 60 * 1000).toISOString(),
      },
    ],
  },
];

const globalForMock = globalThis as typeof globalThis & { __caasMockState?: MockState };

function cloneState(state: MockState): MockState {
  return {
    garments: state.garments.map((g) => ({ ...g, photos: g.photos.map((p) => ({ ...p })) })),
    negotiations: state.negotiations.map((n) => ({
      ...n,
      agreedHandoff: n.agreedHandoff ? { ...n.agreedHandoff } : null,
      messages: n.messages.map((m) => ({ ...m, toolCall: m.toolCall ? { ...m.toolCall } : null })),
    })),
  };
}

function getState(): MockState {
  if (!globalForMock.__caasMockState) {
    globalForMock.__caasMockState = cloneState({ garments: seedGarments, negotiations: seedNegotiations });
  }
  return globalForMock.__caasMockState;
}

export function listMockGarments(user: DemoUser) {
  return getState().garments
    .filter((g) => g.userId === user.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((g) => ({
      id: g.id,
      category: g.category,
      subcategory: g.subcategory,
      colorPrimary: g.colorPrimary,
      pattern: g.pattern,
      silhouette: g.silhouette,
      brandGuess: g.brandGuess,
      description: g.description,
      heroImageUrl: g.heroImageUrl,
      wearCount: g.wearCount,
      lastWornAt: g.lastWornAt,
      estimatedValueUsd: g.estimatedValueUsd,
      vault: g.vault,
      createdAt: g.createdAt,
    }));
}

export function getMockGarment(id: string, user: DemoUser) {
  const garment = getState().garments.find((g) => g.id === id && g.userId === user.id);
  if (!garment) return null;
  return {
    ...garment,
    imageEmbedding: undefined,
    textEmbedding: undefined,
    photos: garment.photos.map((p) => ({ ...p })),
  };
}

export function updateMockGarment(id: string, user: DemoUser, updates: { vault?: boolean }) {
  const garment = getState().garments.find((g) => g.id === id && g.userId === user.id);
  if (!garment) return null;
  if (typeof updates.vault === "boolean") garment.vault = updates.vault;
  return { id: garment.id, vault: garment.vault };
}

export function searchMockWishlist(user: DemoUser, queryText: string, maxPricePerDay?: number) {
  const terms = queryText.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = getState().garments
    .filter((g) => g.userId !== user.id && !g.vault)
    .map((g) => {
      const haystack = `${g.category} ${g.subcategory ?? ""} ${g.brandGuess ?? ""} ${g.description}`.toLowerCase();
      const score = terms.reduce((acc, term) => acc + (haystack.includes(term) ? 1 : 0), 0);
      const similarity = terms.length > 0 ? Math.max(0.45, score / terms.length) : 0.45;
      const owner = Object.values(DEMO_USERS).find((candidate) => candidate.id === g.userId)!;
      return {
        id: g.id,
        category: g.category,
        subcategory: g.subcategory,
        brandGuess: g.brandGuess,
        description: g.description,
        heroImageUrl: g.heroImageUrl,
        estimatedValueUsd: g.estimatedValueUsd,
        vault: g.vault,
        userId: g.userId,
        ownerName: owner.name,
        similarity,
        matchPercent: Math.round(similarity * 100),
        estimatedDailyRental: g.estimatedValueUsd ? Math.round(g.estimatedValueUsd * 0.1) : null,
      };
    })
    .sort((a, b) => b.matchPercent - a.matchPercent)
    .slice(0, 10);

  return {
    matches:
      maxPricePerDay && maxPricePerDay > 0
        ? matches.filter((m) => !m.estimatedDailyRental || m.estimatedDailyRental <= maxPricePerDay)
        : matches,
  };
}

function getGarmentSummary(garmentId: string) {
  const garment = getState().garments.find((g) => g.id === garmentId);
  if (!garment) return null;
  return {
    id: garment.id,
    category: garment.category,
    brandGuess: garment.brandGuess,
    description: garment.description,
    heroImageUrl: garment.heroImageUrl,
    estimatedValueUsd: garment.estimatedValueUsd,
  };
}

export function listMockNegotiations(user: DemoUser) {
  return getState().negotiations
    .filter((n) => n.requesterId === user.id || n.ownerId === user.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((n) => {
      const garment = getGarmentSummary(n.garmentId);
      return {
        id: n.id,
        requesterId: n.requesterId,
        ownerId: n.ownerId,
        garmentId: n.garmentId,
        status: n.status,
        agreedPriceUsd: n.agreedPriceUsd,
        agreedHandoff: n.agreedHandoff,
        turnCount: n.turnCount,
        createdAt: n.createdAt,
        closedAt: n.closedAt,
        garmentCategory: garment?.category ?? "Garment",
        garmentHeroUrl: garment?.heroImageUrl ?? "",
        garmentBrand: garment?.brandGuess ?? null,
        garmentDescription: garment?.description ?? "",
      };
    });
}

export function createMockNegotiation(user: DemoUser, ownerId: string, garmentId: string) {
  const negotiation: MockNegotiation = {
    id: randomUUID(),
    requesterId: user.id,
    ownerId,
    garmentId,
    status: "open",
    agreedPriceUsd: null,
    agreedHandoff: null,
    turnCount: 0,
    createdAt: new Date().toISOString(),
    closedAt: null,
    messages: [],
  };
  getState().negotiations.push(negotiation);
  return { ...negotiation, messages: [] };
}

export function getMockNegotiation(id: string) {
  const negotiation = getState().negotiations.find((n) => n.id === id);
  if (!negotiation) return null;
  return {
    ...negotiation,
    garment: getGarmentSummary(negotiation.garmentId),
    messages: negotiation.messages.map((m) => ({ ...m, toolCall: m.toolCall ? { ...m.toolCall } : null })),
  };
}

export function updateMockNegotiation(
  id: string,
  updates: { status?: string; agreedPriceUsd?: number; agreedHandoff?: unknown },
) {
  const negotiation = getState().negotiations.find((n) => n.id === id);
  if (!negotiation) return null;
  if (updates.status) {
    negotiation.status = updates.status;
    if (["accepted", "rejected", "expired"].includes(updates.status)) {
      negotiation.closedAt = new Date().toISOString();
    }
  }
  if (updates.agreedPriceUsd !== undefined) negotiation.agreedPriceUsd = updates.agreedPriceUsd;
  if (updates.agreedHandoff !== undefined) negotiation.agreedHandoff = updates.agreedHandoff as MockNegotiation["agreedHandoff"];
  return { ...negotiation };
}

export function createMockIngestBatch(asKey: DemoUserKey) {
  const batchId = randomUUID();
  const garmentId = randomUUID();
  const userId = DEMO_USERS[asKey].id;
  const createdAt = new Date().toISOString();
  const newGarment: MockGarment = {
    id: garmentId,
    userId,
    category: "Top",
    subcategory: "Imported Knit Top",
    colorPrimary: "cream",
    colorSecondary: null,
    pattern: "solid",
    silhouette: "fitted",
    brandGuess: "Demo Atelier",
    description: "Freshly imported knit top from mock ingest flow.",
    heroImageUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80",
    wearCount: 0,
    lastWornAt: null,
    estimatedValueUsd: 95,
    vault: false,
    createdAt,
    photos: [photo(garmentId, "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80")],
  };
  getState().garments.push(newGarment);

  const events = [
    { type: "batch_progress", photosDone: 0, photosTotal: 1, garmentsTotal: 0 },
    {
      type: "garment_created",
      garmentId,
      category: newGarment.category,
      heroUrl: newGarment.heroImageUrl,
      brandGuess: newGarment.brandGuess,
    },
    { type: "batch_progress", photosDone: 1, photosTotal: 1, garmentsTotal: 1 },
    { type: "batch_complete" },
  ];

  return { batchId, accepted: 1, events };
}
