import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  avatarUrl: text("avatar_url"),
  googleOauthToken: text("google_oauth_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const friendships = pgTable(
  "friendships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userAId: uuid("user_a_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userBId: uuid("user_b_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("friendships_unordered_pair_idx").on(
      sql`LEAST(${t.userAId}, ${t.userBId})`,
      sql`GREATEST(${t.userAId}, ${t.userBId})`,
    ),
  ],
);

export const photos = pgTable("photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fileUrl: text("file_url").notNull(),
  takenAt: timestamp("taken_at", { withTimezone: true }),
  processed: boolean("processed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const garments = pgTable("garments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  colorPrimary: text("color_primary"),
  colorSecondary: text("color_secondary"),
  pattern: text("pattern"),
  silhouette: text("silhouette"),
  brandGuess: text("brand_guess"),
  brandConfidence: doublePrecision("brand_confidence"),
  description: text("description").notNull(),
  heroImageUrl: text("hero_image_url").notNull(),
  imageEmbedding: vector("image_embedding", { dimensions: 512 }),
  textEmbedding: vector("text_embedding", { dimensions: 768 }),
  wearCount: integer("wear_count").notNull().default(0),
  lastWornAt: timestamp("last_worn_at", { withTimezone: true }),
  estimatedValueUsd: integer("estimated_value_usd"),
  vault: boolean("vault").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const garmentPhotos = pgTable("garment_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  garmentId: uuid("garment_id")
    .notNull()
    .references(() => garments.id, { onDelete: "cascade" }),
  photoId: uuid("photo_id")
    .notNull()
    .references(() => photos.id, { onDelete: "cascade" }),
  cropBbox: jsonb("crop_bbox").$type<{ x: number; y: number; w: number; h: number }>(),
  extractionConfidence: doublePrecision("extraction_confidence"),
});

export const wishlistItems = pgTable("wishlist_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  queryText: text("query_text").notNull(),
  queryEmbedding: vector("query_embedding", { dimensions: 768 }),
  referenceImageUrl: text("reference_image_url"),
  referenceImageEmbedding: vector("reference_image_embedding", { dimensions: 512 }),
  maxRentalPriceUsd: integer("max_rental_price_usd"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rentalNegotiations = pgTable("rental_negotiations", {
  id: uuid("id").primaryKey().defaultRandom(),
  requesterId: uuid("requester_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  garmentId: uuid("garment_id")
    .notNull()
    .references(() => garments.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("open"),
  agreedPriceUsd: integer("agreed_price_usd"),
  agreedHandoff: jsonb("agreed_handoff").$type<{
    type: "calendar_event" | "shipping" | "in_person";
    event_id?: string;
    datetime?: string;
    location?: string;
  }>(),
  turnCount: integer("turn_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

export const negotiationMessages = pgTable("negotiation_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  negotiationId: uuid("negotiation_id")
    .notNull()
    .references(() => rentalNegotiations.id, { onDelete: "cascade" }),
  speaker: text("speaker").notNull(),
  content: text("content").notNull(),
  toolCall: jsonb("tool_call"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const calendarEventsCache = pgTable("calendar_events_cache", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  googleEventId: text("google_event_id").notNull(),
  title: text("title").notNull(),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  attendeeEmails: text("attendee_emails").array().notNull().default(sql`ARRAY[]::text[]`),
  location: text("location"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});
