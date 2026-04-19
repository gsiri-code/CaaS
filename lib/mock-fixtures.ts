import type { InferSelectModel } from "drizzle-orm";
import {
  garments,
  negotiationMessages as negotiationMessagesTable,
  rentalNegotiations,
} from "@/db/schema";
import { DEMO_USERS, type DemoUserKey } from "@/lib/demo-users";

export type GarmentRow = InferSelectModel<typeof garments>;
export type NegotiationRow = InferSelectModel<typeof rentalNegotiations>;
export type NegotiationMessageRow = InferSelectModel<typeof negotiationMessagesTable>;

export type ClosetGarmentMock = Pick<
  GarmentRow,
  | "id"
  | "category"
  | "subcategory"
  | "colorPrimary"
  | "pattern"
  | "silhouette"
  | "brandGuess"
  | "description"
  | "heroImageUrl"
  | "wearCount"
  | "lastWornAt"
  | "estimatedValueUsd"
  | "vault"
  | "createdAt"
>;

export type GarmentPhotoMock = {
  id: string;
  photoId: string;
  fileUrl: string;
  cropBbox: { x: number; y: number; w: number; h: number } | null;
};

export type GarmentDetailMock = Pick<
  GarmentRow,
  | "id"
  | "category"
  | "subcategory"
  | "colorPrimary"
  | "colorSecondary"
  | "pattern"
  | "silhouette"
  | "brandGuess"
  | "description"
  | "heroImageUrl"
  | "wearCount"
  | "lastWornAt"
  | "estimatedValueUsd"
  | "vault"
> & {
  photos: GarmentPhotoMock[];
};

export type ClosetGarmentResponse = ClosetGarmentMock[];
export type GarmentDetailResponse = GarmentDetailMock;
export type WishlistSearchResponse = {
  matches: WishlistMatchMock[];
};
export type NegotiationListResponse = NegotiationListMock[];
export type NegotiationDetailResponse = NegotiationDetailMock;

export type WishlistMatchMock = Pick<
  GarmentRow,
  | "id"
  | "category"
  | "subcategory"
  | "brandGuess"
  | "description"
  | "heroImageUrl"
  | "estimatedValueUsd"
> & {
  ownerName: string;
  userId: string;
  matchPercent: number;
  estimatedDailyRental: number | null;
};

export type HandoffMock = {
  type: "calendar_event" | "shipping";
  event_id?: string;
  datetime?: string;
  location?: string;
};

export type NegotiationListMock = Pick<
  NegotiationRow,
  | "id"
  | "requesterId"
  | "ownerId"
  | "garmentId"
  | "status"
  | "agreedPriceUsd"
  | "turnCount"
> & {
  agreedHandoff: HandoffMock | null;
  garmentCategory: string;
  garmentHeroUrl: string;
  garmentBrand: string | null;
  garmentDescription: string;
};

export type NegotiationMessageMock = Pick<
  NegotiationMessageRow,
  "id" | "speaker" | "content" | "createdAt"
> & {
  toolCall: { name: string; result?: string } | null;
};

export type NegotiationDetailMock = NegotiationListMock & {
  messages: NegotiationMessageMock[];
  garment: {
    id: string;
    category: string;
    brandGuess: string | null;
    description: string;
    heroImageUrl: string;
    estimatedValueUsd: number | null;
  };
};

const ISO = {
  mar01: "2026-03-01T18:15:00.000Z",
  mar08: "2026-03-08T16:20:00.000Z",
  mar14: "2026-03-14T22:10:00.000Z",
  mar16: "2026-03-16T08:35:00.000Z",
  mar18: "2026-03-18T17:45:00.000Z",
  mar20: "2026-03-20T12:05:00.000Z",
  mar22: "2026-03-22T09:15:00.000Z",
  mar24: "2026-03-24T14:30:00.000Z",
  mar25: "2026-03-25T19:10:00.000Z",
  mar27: "2026-03-27T15:40:00.000Z",
  mar28: "2026-03-28T11:00:00.000Z",
  apr02: "2026-04-02T18:20:00.000Z",
  apr04: "2026-04-04T21:00:00.000Z",
  apr05: "2026-04-05T13:30:00.000Z",
  apr06: "2026-04-06T09:45:00.000Z",
  apr08: "2026-04-08T20:15:00.000Z",
  apr09: "2026-04-09T16:00:00.000Z",
  apr10: "2026-04-10T10:30:00.000Z",
  apr11: "2026-04-11T18:10:00.000Z",
  apr12: "2026-04-12T08:55:00.000Z",
  apr14: "2026-04-14T19:25:00.000Z",
  apr16: "2026-04-16T12:00:00.000Z",
  apr18: "2026-04-18T17:20:00.000Z",
  apr19: "2026-04-19T11:15:00.000Z",
} as const;

const CREATED_AT = {
  jan12: new Date("2026-01-12T10:00:00.000Z"),
  jan28: new Date("2026-01-28T16:40:00.000Z"),
  feb14: new Date("2026-02-14T12:20:00.000Z"),
  feb27: new Date("2026-02-27T18:05:00.000Z"),
  mar03: new Date("2026-03-03T09:10:00.000Z"),
  mar11: new Date("2026-03-11T14:50:00.000Z"),
} as const;

type MockGarmentSeed = Omit<GarmentDetailMock, "lastWornAt"> & {
  lastWornAt: Date | null;
  createdAt: Date;
};

type MockNegotiationMessageSeed = Omit<NegotiationMessageMock, "createdAt"> & {
  createdAt: Date;
};

const aliceGarments: MockGarmentSeed[] = [
  {
    id: "a1111111-1111-4111-8111-111111111101",
    category: "Dress",
    subcategory: "black satin midi dress",
    colorPrimary: "black",
    colorSecondary: null,
    pattern: "solid",
    silhouette: "slip",
    brandGuess: "Reformation",
    description:
      "Bias-cut black satin midi dress with a soft cowl neck and elegant drape for evening events.",
    heroImageUrl: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
    wearCount: 4,
    lastWornAt: new Date(ISO.apr08),
    estimatedValueUsd: 240,
    vault: false,
    createdAt: CREATED_AT.feb14,
    photos: [
      {
        id: "ap-1",
        photoId: "alice-photo-1",
        fileUrl: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=300&q=80",
        cropBbox: { x: 0.22, y: 0.08, w: 0.45, h: 0.7 },
      },
      {
        id: "ap-2",
        photoId: "alice-photo-2",
        fileUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=300&q=80",
        cropBbox: { x: 0.18, y: 0.12, w: 0.4, h: 0.66 },
      },
    ],
  },
  {
    id: "a1111111-1111-4111-8111-111111111102",
    category: "Outerwear",
    subcategory: "camel wool coat",
    colorPrimary: "camel",
    colorSecondary: null,
    pattern: "solid",
    silhouette: "tailored",
    brandGuess: "Max Mara",
    description:
      "Long camel wool wrap coat with clean lapels and enough structure to elevate denim or dresses.",
    heroImageUrl: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=80",
    wearCount: 11,
    lastWornAt: new Date(ISO.mar25),
    estimatedValueUsd: 620,
    vault: true,
    createdAt: CREATED_AT.jan28,
    photos: [
      {
        id: "ap-3",
        photoId: "alice-photo-3",
        fileUrl: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=300&q=80",
        cropBbox: { x: 0.16, y: 0.1, w: 0.5, h: 0.78 },
      },
    ],
  },
  {
    id: "a1111111-1111-4111-8111-111111111103",
    category: "Shoes",
    subcategory: "white leather sneakers",
    colorPrimary: "white",
    colorSecondary: "gum",
    pattern: "solid",
    silhouette: "low-top",
    brandGuess: "Veja",
    description:
      "Minimal white leather sneakers with gum sole and subtle branding for everyday wear.",
    heroImageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
    wearCount: 26,
    lastWornAt: new Date(ISO.apr18),
    estimatedValueUsd: 150,
    vault: false,
    createdAt: CREATED_AT.mar11,
    photos: [],
  },
];

const bobGarments: MockGarmentSeed[] = [
  {
    id: "b2222222-2222-4222-8222-222222222201",
    category: "Outerwear",
    subcategory: "navy double-breasted blazer",
    colorPrimary: "navy",
    colorSecondary: null,
    pattern: "solid",
    silhouette: "structured",
    brandGuess: "Theory",
    description:
      "Sharp navy blazer with polished buttons and a lightly structured shoulder that works for dinner or meetings.",
    heroImageUrl: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80",
    wearCount: 7,
    lastWornAt: new Date(ISO.apr11),
    estimatedValueUsd: 340,
    vault: false,
    createdAt: CREATED_AT.feb27,
    photos: [
      {
        id: "bp-1",
        photoId: "bob-photo-1",
        fileUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=300&q=80",
        cropBbox: { x: 0.2, y: 0.06, w: 0.48, h: 0.72 },
      },
    ],
  },
  {
    id: "b2222222-2222-4222-8222-222222222202",
    category: "Dress",
    subcategory: "emerald silk wrap dress",
    colorPrimary: "emerald",
    colorSecondary: null,
    pattern: "solid",
    silhouette: "wrap",
    brandGuess: "Diane von Furstenberg",
    description:
      "Fluid silk wrap dress in emerald with a subtle sheen and flattering midi-length hem.",
    heroImageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
    wearCount: 3,
    lastWornAt: new Date(ISO.apr14),
    estimatedValueUsd: 310,
    vault: false,
    createdAt: CREATED_AT.mar03,
    photos: [
      {
        id: "bp-2",
        photoId: "bob-photo-2",
        fileUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80",
        cropBbox: { x: 0.24, y: 0.09, w: 0.38, h: 0.71 },
      },
    ],
  },
  {
    id: "b2222222-2222-4222-8222-222222222203",
    category: "Bag",
    subcategory: "cream shoulder bag",
    colorPrimary: "cream",
    colorSecondary: "gold",
    pattern: "solid",
    silhouette: "structured",
    brandGuess: "Coach",
    description:
      "Compact cream shoulder bag with gold hardware and enough room for evening essentials.",
    heroImageUrl: "https://images.unsplash.com/photo-1542291026-a92f0d6f6c61?auto=format&fit=crop&w=900&q=80",
    wearCount: 9,
    lastWornAt: new Date(ISO.apr06),
    estimatedValueUsd: 210,
    vault: true,
    createdAt: CREATED_AT.jan12,
    photos: [],
  },
];

export const MOCK_GARMENTS_BY_USER: Record<DemoUserKey, MockGarmentSeed[]> = {
  alice: aliceGarments,
  bob: bobGarments,
};

export const MOCK_WISHLIST_MATCHES_BY_USER: Record<DemoUserKey, WishlistMatchMock[]> = {
  alice: [
    {
      id: bobGarments[1].id,
      category: bobGarments[1].category,
      subcategory: bobGarments[1].subcategory,
      brandGuess: bobGarments[1].brandGuess,
      description: bobGarments[1].description,
      heroImageUrl: bobGarments[1].heroImageUrl,
      estimatedValueUsd: bobGarments[1].estimatedValueUsd,
      ownerName: DEMO_USERS.bob.name,
      userId: DEMO_USERS.bob.id,
      matchPercent: 96,
      estimatedDailyRental: 32,
    },
    {
      id: bobGarments[0].id,
      category: bobGarments[0].category,
      subcategory: bobGarments[0].subcategory,
      brandGuess: bobGarments[0].brandGuess,
      description: bobGarments[0].description,
      heroImageUrl: bobGarments[0].heroImageUrl,
      estimatedValueUsd: bobGarments[0].estimatedValueUsd,
      ownerName: DEMO_USERS.bob.name,
      userId: DEMO_USERS.bob.id,
      matchPercent: 82,
      estimatedDailyRental: 34,
    },
  ],
  bob: [
    {
      id: aliceGarments[0].id,
      category: aliceGarments[0].category,
      subcategory: aliceGarments[0].subcategory,
      brandGuess: aliceGarments[0].brandGuess,
      description: aliceGarments[0].description,
      heroImageUrl: aliceGarments[0].heroImageUrl,
      estimatedValueUsd: aliceGarments[0].estimatedValueUsd,
      ownerName: DEMO_USERS.alice.name,
      userId: DEMO_USERS.alice.id,
      matchPercent: 94,
      estimatedDailyRental: 24,
    },
    {
      id: aliceGarments[2].id,
      category: aliceGarments[2].category,
      subcategory: aliceGarments[2].subcategory,
      brandGuess: aliceGarments[2].brandGuess,
      description: aliceGarments[2].description,
      heroImageUrl: aliceGarments[2].heroImageUrl,
      estimatedValueUsd: aliceGarments[2].estimatedValueUsd,
      ownerName: DEMO_USERS.alice.name,
      userId: DEMO_USERS.alice.id,
      matchPercent: 71,
      estimatedDailyRental: 15,
    },
  ],
};

const negotiationList: NegotiationListMock[] = [
  {
    id: "n3333333-3333-4333-8333-333333333301",
    requesterId: DEMO_USERS.alice.id,
    ownerId: DEMO_USERS.bob.id,
    garmentId: bobGarments[1].id,
    status: "open",
    agreedPriceUsd: 30,
    agreedHandoff: {
      type: "calendar_event",
      event_id: "evt-demo-emerald-1",
      datetime: "2026-04-20T18:30:00.000Z",
      location: "Blue Bottle on Abbot Kinney",
    },
    turnCount: 5,
    garmentCategory: bobGarments[1].subcategory ?? bobGarments[1].category,
    garmentHeroUrl: bobGarments[1].heroImageUrl,
    garmentBrand: bobGarments[1].brandGuess,
    garmentDescription: bobGarments[1].description,
  },
  {
    id: "n3333333-3333-4333-8333-333333333302",
    requesterId: DEMO_USERS.bob.id,
    ownerId: DEMO_USERS.alice.id,
    garmentId: aliceGarments[2].id,
    status: "accepted",
    agreedPriceUsd: 14,
    agreedHandoff: {
      type: "shipping",
      datetime: "2026-04-12T08:55:00.000Z",
      location: "Messenger pickup",
    },
    turnCount: 4,
    garmentCategory: aliceGarments[2].subcategory ?? aliceGarments[2].category,
    garmentHeroUrl: aliceGarments[2].heroImageUrl,
    garmentBrand: aliceGarments[2].brandGuess,
    garmentDescription: aliceGarments[2].description,
  },
  {
    id: "n3333333-3333-4333-8333-333333333303",
    requesterId: DEMO_USERS.alice.id,
    ownerId: DEMO_USERS.bob.id,
    garmentId: bobGarments[0].id,
    status: "rejected",
    agreedPriceUsd: null,
    agreedHandoff: null,
    turnCount: 3,
    garmentCategory: bobGarments[0].subcategory ?? bobGarments[0].category,
    garmentHeroUrl: bobGarments[0].heroImageUrl,
    garmentBrand: bobGarments[0].brandGuess,
    garmentDescription: bobGarments[0].description,
  },
];

const negotiationMessages: Record<string, MockNegotiationMessageSeed[]> = {
  "n3333333-3333-4333-8333-333333333301": [
    {
      id: "m-301-1",
      speaker: "alice",
      content: "I love the emerald wrap dress. Could we keep it around $28/day for Friday through Sunday?",
      toolCall: null,
      createdAt: new Date(ISO.apr16),
    },
    {
      id: "m-301-2",
      speaker: "bob",
      content: "Happy to lend it. My agent suggested $34/day because it was freshly cleaned.",
      toolCall: { name: "price_estimator", result: "$34/day fair market" },
      createdAt: new Date(ISO.apr16),
    },
    {
      id: "m-301-3",
      speaker: "alice",
      content: "Could we meet at $30/day if pickup is easy?",
      toolCall: null,
      createdAt: new Date(ISO.apr18),
    },
    {
      id: "m-301-4",
      speaker: "bob",
      content: "Deal at $30/day. I can hand it off Monday at 6:30 near Abbot Kinney.",
      toolCall: { name: "calendar_lookup", result: "Mon 6:30 PM available" },
      createdAt: new Date(ISO.apr18),
    },
  ],
  "n3333333-3333-4333-8333-333333333302": [
    {
      id: "m-302-1",
      speaker: "bob",
      content: "Are the white sneakers available for a weekend trip?",
      toolCall: null,
      createdAt: new Date(ISO.apr09),
    },
    {
      id: "m-302-2",
      speaker: "alice",
      content: "Yes — I can do $14/day and send them by messenger Friday morning.",
      toolCall: { name: "delivery_scheduler", result: "Courier window reserved" },
      createdAt: new Date(ISO.apr10),
    },
    {
      id: "m-302-3",
      speaker: "bob",
      content: "Perfect, accepted.",
      toolCall: null,
      createdAt: new Date(ISO.apr10),
    },
  ],
  "n3333333-3333-4333-8333-333333333303": [
    {
      id: "m-303-1",
      speaker: "alice",
      content: "Would Bob consider lending the navy blazer for $18/day?",
      toolCall: null,
      createdAt: new Date(ISO.apr04),
    },
    {
      id: "m-303-2",
      speaker: "bob",
      content: "I’m keeping that one for an upcoming work trip, so I need to pass this time.",
      toolCall: null,
      createdAt: new Date(ISO.apr05),
    },
  ],
};

export const MOCK_NEGOTIATIONS_BY_USER: Record<DemoUserKey, NegotiationListMock[]> = {
  alice: negotiationList.filter(
    (item) => item.requesterId === DEMO_USERS.alice.id || item.ownerId === DEMO_USERS.alice.id,
  ),
  bob: negotiationList.filter(
    (item) => item.requesterId === DEMO_USERS.bob.id || item.ownerId === DEMO_USERS.bob.id,
  ),
};

export const MOCK_NEGOTIATION_DETAILS: Record<string, NegotiationDetailMock> = Object.fromEntries(
  negotiationList.map((item) => {
    const garment = [...aliceGarments, ...bobGarments].find((g) => g.id === item.garmentId);
    return [
      item.id,
      {
        ...item,
        messages: negotiationMessages[item.id] ?? [],
        garment: {
          id: garment?.id ?? item.garmentId,
          category: garment?.subcategory ?? garment?.category ?? item.garmentCategory,
          brandGuess: garment?.brandGuess ?? null,
          description: garment?.description ?? item.garmentDescription,
          heroImageUrl: garment?.heroImageUrl ?? item.garmentHeroUrl,
          estimatedValueUsd: garment?.estimatedValueUsd ?? null,
        },
      },
    ];
  }),
) as Record<string, NegotiationDetailMock>;

export function getMockClosetGarments(as: DemoUserKey): ClosetGarmentMock[] {
  return MOCK_GARMENTS_BY_USER[as].map((garment) => ({
    id: garment.id,
    category: garment.category,
    subcategory: garment.subcategory,
    colorPrimary: garment.colorPrimary,
    pattern: garment.pattern,
    silhouette: garment.silhouette,
    brandGuess: garment.brandGuess,
    description: garment.description,
    heroImageUrl: garment.heroImageUrl,
    wearCount: garment.wearCount,
    lastWornAt: garment.lastWornAt,
    estimatedValueUsd: garment.estimatedValueUsd,
    vault: garment.vault,
    createdAt: garment.createdAt ?? null,
  }));
}

export function getMockGarmentDetail(as: DemoUserKey, id: string): GarmentDetailMock | null {
  const garment = MOCK_GARMENTS_BY_USER[as].find((item) => item.id === id);
  if (!garment) return null;
  const { createdAt: _createdAt, ...detail } = garment;
  return detail;
}

export function getMockWishlistMatches(as: DemoUserKey, maxPricePerDay?: number): WishlistMatchMock[] {
  const matches = MOCK_WISHLIST_MATCHES_BY_USER[as];
  if (!maxPricePerDay || maxPricePerDay <= 0) return matches;
  return matches.filter(
    (match) => !match.estimatedDailyRental || match.estimatedDailyRental <= maxPricePerDay,
  );
}

export function getMockNegotiations(as: DemoUserKey): NegotiationListMock[] {
  return MOCK_NEGOTIATIONS_BY_USER[as];
}

export function getMockNegotiationDetail(id: string): NegotiationDetailMock | null {
  return MOCK_NEGOTIATION_DETAILS[id] ?? null;
}
