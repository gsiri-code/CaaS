"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  WishlistMatchMock as Match,
  WishlistSearchResponse,
} from "@/lib/mock-fixtures";

const SAMPLE_QUERIES = [
  "black satin midi dress for an evening event",
  "camel wool coat for a cold dinner",
  "white sneakers for a weekend trip",
];

export default function WishlistClient({ as }: { as: "alice" | "bob" }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setSearched(false);
    try {
      const res = await fetch(`/api/wishlist/search?as=${as}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queryText: query,
          maxPricePerDay: maxPrice ? parseInt(maxPrice) : undefined,
        }),
      });
      const data: WishlistSearchResponse = await res.json();
      setMatches(data.matches || []);
      setSearched(true);
    } catch {
      setMatches([]);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  }

  async function handleRent(match: Match) {
    const res = await fetch(`/api/negotiations?as=${as}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        garmentId: match.id,
        ownerId: match.userId,
      }),
    });
    if (res.ok) {
      router.push(`/negotiations?as=${as}`);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-6 pt-16 pb-4">
        <h1 className="text-[28px] font-light tracking-tight leading-[34px]">
          Find It In a{"\n"}Friend&apos;s Closet
        </h1>
      </div>

      {/* Search Area */}
      <div className="px-6 flex flex-col gap-3">
        <textarea
          placeholder="black satin midi dress for an evening event..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-[72px] rounded-lg border border-black/10 px-4 py-3 text-[15px] resize-none outline-none placeholder:text-[#999] focus:border-black/30 transition-colors"
        />

        <div className="flex gap-3">
          <button className="flex-1 h-11 rounded border border-black/10 text-[14px] text-[#757575] flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Add photo
          </button>
          <div className="flex-1 h-11 rounded border border-black/10 flex items-center px-3">
            <input
              type="text"
              placeholder="Max $__/day"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-transparent text-[14px] outline-none placeholder:text-[#999]"
            />
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="h-12 rounded bg-black text-white text-[15px] font-medium flex items-center justify-center disabled:opacity-50 transition-opacity"
        >
          {searching ? "Searching..." : "Search Friends' Closets"}
        </button>

        <div className="flex flex-wrap gap-2 pt-1">
          {SAMPLE_QUERIES.map((sample) => (
            <button
              key={sample}
              onClick={() => setQuery(sample)}
              className="rounded-full bg-[#F5F5F5] px-3 py-2 text-[12px] text-[#555] text-left"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {searched && (
        <div className="px-6 pt-6">
          {/* Divider with count */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-black/10" />
            <span className="text-[12px] text-[#757575] font-medium">
              {matches.length} Match{matches.length !== 1 ? "es" : ""}
            </span>
            <div className="flex-1 h-px bg-black/10" />
          </div>

          {/* Match Cards */}
          <div className="flex flex-col gap-3">
            {matches.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3.5 p-3 rounded-[10px] bg-[#FAFAFA]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.heroImageUrl}
                  alt={m.category}
                  className="w-16 h-20 rounded object-cover bg-[#E8E8E8] flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium truncate">
                    {m.subcategory || m.category}
                  </p>
                  <p className="text-[13px] text-[#757575] mt-0.5">
                    {m.ownerName}&apos;s closet
                  </p>
                  <div className="flex gap-3 mt-1 text-[13px] text-[#757575]">
                    <span>{m.matchPercent}% match</span>
                    {m.estimatedDailyRental && (
                      <span>~${m.estimatedDailyRental}/day</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRent(m)}
                  className="h-8 px-4 rounded bg-black/5 text-[13px] font-medium flex-shrink-0"
                >
                  Rent
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
