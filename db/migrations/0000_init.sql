CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "calendar_events_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"google_event_id" text NOT NULL,
	"title" text NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"attendee_emails" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"location" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_a_id" uuid NOT NULL,
	"user_b_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "garment_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"garment_id" uuid NOT NULL,
	"photo_id" uuid NOT NULL,
	"crop_bbox" jsonb,
	"extraction_confidence" double precision
);
--> statement-breakpoint
CREATE TABLE "garments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"color_primary" text,
	"color_secondary" text,
	"pattern" text,
	"silhouette" text,
	"brand_guess" text,
	"brand_confidence" double precision,
	"description" text NOT NULL,
	"hero_image_url" text NOT NULL,
	"image_embedding" vector(512),
	"text_embedding" vector(768),
	"wear_count" integer DEFAULT 0 NOT NULL,
	"last_worn_at" timestamp with time zone,
	"estimated_value_usd" integer,
	"vault" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "negotiation_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negotiation_id" uuid NOT NULL,
	"speaker" text NOT NULL,
	"content" text NOT NULL,
	"tool_call" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"file_url" text NOT NULL,
	"taken_at" timestamp with time zone,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rental_negotiations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"garment_id" uuid NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"agreed_price_usd" integer,
	"agreed_handoff" jsonb,
	"turn_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"avatar_url" text,
	"google_oauth_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"query_text" text NOT NULL,
	"query_embedding" vector(768),
	"reference_image_url" text,
	"reference_image_embedding" vector(512),
	"max_rental_price_usd" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_events_cache" ADD CONSTRAINT "calendar_events_cache_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_a_id_users_id_fk" FOREIGN KEY ("user_a_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_b_id_users_id_fk" FOREIGN KEY ("user_b_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garment_photos" ADD CONSTRAINT "garment_photos_garment_id_garments_id_fk" FOREIGN KEY ("garment_id") REFERENCES "public"."garments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garment_photos" ADD CONSTRAINT "garment_photos_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garments" ADD CONSTRAINT "garments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_messages" ADD CONSTRAINT "negotiation_messages_negotiation_id_rental_negotiations_id_fk" FOREIGN KEY ("negotiation_id") REFERENCES "public"."rental_negotiations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_negotiations" ADD CONSTRAINT "rental_negotiations_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_negotiations" ADD CONSTRAINT "rental_negotiations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_negotiations" ADD CONSTRAINT "rental_negotiations_garment_id_garments_id_fk" FOREIGN KEY ("garment_id") REFERENCES "public"."garments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "friendships_unordered_pair_idx" ON "friendships" USING btree (LEAST("user_a_id", "user_b_id"),GREATEST("user_a_id", "user_b_id"));--> statement-breakpoint
CREATE INDEX "garments_image_embedding_hnsw" ON "garments" USING hnsw ("image_embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "garments_text_embedding_hnsw" ON "garments" USING hnsw ("text_embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "wishlist_query_embedding_hnsw" ON "wishlist_items" USING hnsw ("query_embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "wishlist_reference_image_embedding_hnsw" ON "wishlist_items" USING hnsw ("reference_image_embedding" vector_cosine_ops);