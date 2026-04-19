- Include 3-shot examples in the system prompt
  - Parse, validate with Zod, drop any garment with `confidence < 0.4`
- [ ] Crop each garment from source photo per bbox, save crop, run FashionCLIP to get image embedding
- [ ] Run Gemini `text-embedding-004` on `description` field
- [ ] Implement dedup in `/lib/ingest/dedup.ts`
  - For each new garment, query existing same-user same-category garments by image_embedding cosine similarity
  - If top match > 0.88, merge: add `garment_photos` row, keep higher-confidence crop as hero, do not create new `garments` row
  - Else: insert new `garments` row
  - Start threshold at 0.88, expose constant so it can be tuned during demo rehearsal
- [ ] Build `GET /api/ingest/stream` SSE endpoint that emits events: `photo_processed`, `garment_created`, `garment_merged`, `batch_complete`
- [ ] Build `/app/ingest/page.tsx` with drop zone + live-populating grid
  - Connect to SSE endpoint, append/update garment cards as events arrive
  - Each card: hero crop, category tag, brand guess
  - Show running counts: "Processed 87/200 photos, 34 unique garments"

**Gotchas:**
- Gemini JSON mode can fail; wrap in try/catch with one retry
- Batched calls amortize prompt tokens but increase single-call failure blast radius; 5 photos/batch is the sweet spot [implied]
- FashionCLIP expects RGB, handle RGBA/grayscale conversion
- Verify Gemini pricing at build time; it has shifted

## Phase 3: Closet View and Manual Overrides

**Goal:** User can browse ingested closet, fix obvious errors, flag items as vault (untransactable).

- [ ] Build `GET /api/closet` with category/color filters
- [ ] Build `/app/closet/page.tsx`: grid view, filter chips, search box
- [ ] Build `/app/closet/[id]/page.tsx`: detail view showing all contributing photos
- [ ] Add `PATCH /api/closet/:id` for attribute edits and `vault` toggle
- [ ] Add "merge duplicates" UI: select two cards, call `POST /api/ingest/merge` [implied safety valve]

## Phase 4: Wishlist and Friend-Graph Search

**Goal:** User expresses what they want; system finds it in a friend's closet.

- [ ] Build `POST /api/wishlist` accepting text and/or reference image
  - Compute embeddings, store row
- [ ] Build `POST /api/search/friend-closets` in `/app/api/search/friend-closets/route.ts`
  - Input: query text or image, current user id
  - Resolve friend ids from `friendships`
  - Hybrid query: SQL filter by category (if inferable from query) + pgvector kNN on text_embedding (and image_embedding if reference image provided)
  - Return top 5 matches with owner info, excluding `vault=true` items
- [ ] Build `/app/wishlist/page.tsx`: input form, list of matches, "Request Rental" CTA per match

## Phase 5: Google Calendar Integration

**Goal:** Agents know when the two users will see each other, so handoff can be scheduled via existing plans.

- [ ] Implement OAuth flow: `/api/calendar/connect` and `/api/calendar/callback`
- [ ] On callback, fetch next 14 days of events, upsert into `calendar_events_cache`
- [ ] Build `GET /api/calendar/shared` returning events where both users appear in attendee list OR events scheduled 1:1 between them
- [ ] Return structured: `[{event_id, title, start_at, location}]`

**Gotcha:** Demo accounts need real Google Calendar events seeded between alice@ and bob@ before stage time. Pre-create 2-3 overlapping events.

## Phase 6: Agent Layer (The Second Hero Moment)

**Goal:** Two Claude agents autonomously negotiate a rental, visibly, with calendar-aware handoff.

- [ ] Define tool schemas in `/lib/agents/tools.ts`:
  - `query_my_closet(natural_language, filters?)` → array of garment summaries
  - `query_friend_closet(friend_id, natural_language, filters?)` → array of garment summaries
  - `get_upcoming_shared_events(friend_id, within_days)` → array of calendar events
  - `propose_rental(garment_id, price_usd, duration_days, handoff)` → writes to negotiation_messages
  - `counter_offer(price_usd?, duration_days?, handoff?, reasoning)` → writes message
  - `accept()` → sets negotiation status
  - `reject(reasoning)` → sets negotiation status
- [ ] Write requester agent system prompt in `/lib/agents/prompts/requester.ts`
  - Knows: user's wishlist, budget ceiling, who they're negotiating with, shared calendar events
  - Goal: secure rental under budget, prefer in-person handoff at existing event over shipping
  - Constraints: max 4 turns of counteroffers; never repeat previous offer verbatim; must accept or reject by turn 8
- [ ] Write owner agent system prompt in `/lib/agents/prompts/owner.ts`
  - Knows: garment details, estimated value, wear history, whether it's vault-flagged, user's floor price (20% of estimated value per day as default) [implied]
  - Goal: fair rental; refuse if vault; prefer in-person at shared event
  - Same turn caps
- [ ] Build orchestration loop in `/lib/agents/loop.ts`
  - Alternate turns, writing each agent's output to `negotiation_messages`
  - Stop when `accept()` or `reject()` tool called, or 8 turns elapsed
  - Both agents stream via Anthropic streaming API
- [ ] Build `POST /api/negotiations/start` that kicks off loop as background job
- [ ] Build `GET /api/negotiations/:id/stream` SSE endpoint relaying messages in real time
- [ ] Build `/app/negotiations/[id]/page.tsx`
  - Split-pane UI: requester agent left, owner agent right
  - Stream tokens as they arrive
  - Bottom: current proposed deal card with Accept/Reject buttons for human approval
  - Celebratory animation on mutual accept

**Gotchas:**
- Streaming from two agents in one view: interleave in order of message `created_at`, don't race
- Hard-cap turn count in code, don't trust the model to respect it
- Tool-use loop can hallucinate ids; validate every tool call against DB before executing

## Phase 7: Demo Preparation

**Goal:** Guaranteed-working 3-minute demo with zero live-API gambles.

- [ ] Curate two real camera rolls of 150-200 photos each (your own + teammate's)
- [ ] Pre-run ingestion on both, verify closets look clean; manually fix any egregious mis-tags
- [ ] Seed 2-3 Google Calendar events between the two demo accounts in next 7 days
- [ ] Seed a wishlist query that is guaranteed to match a specific item in the friend's closet
- [ ] Build `POST /api/demo/seed` that resets state to the known-good demo snapshot
- [ ] Build `POST /api/demo/trigger-scenario` that one-clicks the hero flow
- [ ] Record video backup of the entire 3-minute flow, two takes
- [ ] Write 90-second pitch script:
  1. Problem: digital closets have existed a decade, none scaled, ingestion is why (15s)
  2. Live ZIP upload, grid populates (30s)
  3. Wishlist query, agent finds friend's dress, agents negotiate live, calendar-aware handoff lands (30s)
  4. Positioning: Plaid for closets; Phia makes shopping smarter, we make the prerequisite possible (15s)
- [ ] Rehearse 3 times end to end

## Validation Checkpoints

### After Phase 1
- [ ] `psql` into db, confirm `vector` extension installed
- [ ] Run a throwaway script that inserts a dummy 512-dim vector and runs cosine kNN, confirm result
- [ ] Hit each client wrapper with a smoke-test call (Gemini: describe test image; Anthropic: 1-token completion; FashionCLIP: embed test image)
- [ ] Switch between `?as=alice` and `?as=bob`, confirm session helper returns different ids

### After Phase 2
- [ ] Upload test ZIP of 20 photos, confirm grid populates via SSE in under 30 seconds
- [ ] Verify dedup: include same shirt in 3 photos, confirm only 1 garment row created with 3 `garment_photos`
- [ ] Verify false-split bias: include two visually similar but distinct items, confirm they stay separate
- [ ] Spot-check 10 garments for attribute accuracy; tune extraction prompt if category accuracy < 80%
- [ ] Confirm total cost for 200-photo run is under $1 (log API spend)

### After Phase 3
- [ ] Edit a garment's color, refresh, confirm persisted
- [ ] Toggle vault, confirm it disappears from friend-search results

### After Phase 4
- [ ] From alice, search "black dress," confirm bob's black dress surfaces in top 3
- [ ] Search with reference image, confirm visually similar items rank above text-only matches

### After Phase 5
- [ ] Both users OAuth-connect
- [ ] Seed an event with both as attendees, call `/api/calendar/shared`, confirm event returned

### After Phase 6
- [ ] Trigger full negotiation, watch both agents stream to split-pane UI
- [ ] Confirm agent references shared calendar event in handoff proposal
- [ ] Verify hard cap: force a stalemate scenario, confirm loop terminates at turn 8
- [ ] Verify tool-call id validation: inject a fake garment_id in test, confirm graceful rejection

### After Phase 7
- [ ] Run full demo flow 3x with `demo/seed` reset between runs
- [ ] Total stage time under 3 minutes
- [ ] Video backup plays without audio glitches

## Open Questions

- [ ] FashionCLIP hosting: local Python service vs Replicate API. Local is free but requires GPU; Replicate adds latency and ~$0.001/call. Decide based on dev machine capability.
- [ ] Text embedding dimension: Gemini `text-embedding-004` is 768-dim, OpenAI `text-embedding-3-small` is 1536. Pick one and lock schema before migrations.
- [ ] Rental pricing default: "20% of estimated value per day" is a placeholder; does owner agent need a better heuristic or user-set floor?
- [ ] How does `estimated_value_usd` get populated? Gemini brand guess + hardcoded brand price table, or skip and let owner agent guess at negotiation time?
- [ ] Should the requester agent be allowed to browse multiple friend closets in one negotiation, or one-friend-at-a-time for demo clarity?
- [ ] Do we need authentication beyond the hardcoded `?as=` switch? Google OAuth callback needs real users; likely requires minimum real auth.
- [ ] Photo storage: local filesystem vs S3/R2? Local is simpler for 18 hours; risk is stage laptop loses files.
- [ ] Privacy story for judges: the research flagged Phia's HTML-capture incident. Prepare a 1-sentence answer on on-device processing intent even if not implemented in demo.

## Out of Scope

- Selling garments (rental only per strategic decision)
- Trading garments without money (cut in favor of rental for unit economics)
- External marketplace listing (Poshmark, Depop integrations)
- Styling recommendations, outfit suggestions, fit similarity scores
- Daily fit-pic social feed, BeReal mechanic
- Public feed, follower graph, likes, comments
- Cost-per-wear analytics UI (data captured but not surfaced)
- Dupe scouting against external retailers
- Voice negotiation (ElevenLabs) with external sellers
- Multi-friend concurrent negotiations
- Real payment processing (Stripe integration); show "agreed" state only
- Shipping logistics when no shared calendar event exists (show as placeholder)
- iOS-native PhotoKit integration (web ZIP upload only for hackathon)
- Fine-tuning any model
- Real authentication, account creation, password flows
- Mobile-native app (responsive web only)
- B2B / brand dashboard
- Digital Product Passport reader
- Minors / COPPA flow
- Admin panel, moderation, reporting