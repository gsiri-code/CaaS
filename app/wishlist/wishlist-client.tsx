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
        body: JSON.stringify({ queryText: query, maxPricePerDay: maxPrice ? parseInt(maxPrice) : undefined }),
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
      body: JSON.stringify({ garmentId: match.id, ownerId: match.userId }),
    });
    if (res.ok) {
      router.push(`/negotiations?as=${as}`);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-6 pt-20 pb-4 animate-fade-up">
        <p className="text-[11px] tracking-[0.2em] uppercase mb-4" style={{ color: "var(--accent)" }}>
          Discovery
        </p>
        <h1
          className="text-[34px] leading-[1.1] font-light tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Find It In a<br />Friend&apos;s Closet
        </h1>
      </div>

      {/* Search Area */}
      <div className="px-6 flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "0.1s" }}>
        <textarea
          placeholder="black satin midi dress for an evening event..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-[80px] rounded-xl px-4 py-3.5 text-[14px] resize-none outline-none transition-all duration-200 focus:ring-2"
          style={{
            background: "var(--surface)",
            color: "var(--fg)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
        />

        <div className="flex gap-3">
          <button
            className="flex-1 h-11 rounded-xl text-[13px] flex items-center justify-center gap-2 transition-colors hover:opacity-80"
            style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Add photo
          </button>
          <div
            className="flex-1 h-11 rounded-xl flex items-center px-3.5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <input
              type="text"
              placeholder="Max $__/day"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-transparent text-[13px] outline-none"
              style={{ color: "var(--fg)" }}
            />
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="h-[52px] rounded-xl text-[15px] font-medium flex items-center justify-center transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
          style={{ background: "var(--fg)", color: "var(--bg)" }}
        >
          {searching ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Searching...
            </span>
          ) : (
            "Search Friends\u2019 Closets"
          )}
        </button>

        <div className="flex flex-wrap gap-2 pt-1">
          {SAMPLE_QUERIES.map((sample) => (
            <button
              key={sample}
              onClick={() => setQuery(sample)}
              className="rounded-full px-3.5 py-2 text-[11px] text-left tracking-wide transition-colors hover:opacity-70"
              style={{ background: "var(--surface)", color: "var(--muted)" }}
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {searched && (
        <div className="px-6 pt-8 animate-fade-up">
          <div className="flex items-center gap-4 mb-5">
            <div className="flex-1 h-px" style={{ background: "var(--border-strong)" }} />
            <span className="text-[10px] tracking-[0.2em] uppercase font-medium" style={{ color: "var(--muted)" }}>
              {matches.length} Match{matches.length !== 1 ? "es" : ""}
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--border-strong)" }} />
          </div>

          <div className="flex flex-col gap-3">
            {matches.map((m, i) => (
              <div
                key={m.id}
                className="flex items-center gap-4 p-3.5 rounded-xl transition-colors hover:opacity-95 animate-fade-up"
                style={{ background: "var(--surface)", boxShadow: "var(--shadow-sm)", animationDelay: `${0.05 * i}s` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.heroImageUrl}
                  alt={m.category}
                  className="w-16 h-20 rounded-lg object-cover flex-shrink-0"
                  style={{ background: "var(--surface-hover)" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium truncate" style={{ fontFamily: "var(--font-serif)" }}>
                    {m.subcategory || m.category}
                  </p>
                  <p className="text-[12px] mt-0.5 tracking-wide" style={{ color: "var(--muted)" }}>
                    {m.ownerName}&apos;s closet
                  </p>
                  <div className="flex gap-3 mt-1.5">
                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                      {m.matchPercent}% match
                    </span>
                    {m.estimatedDailyRental && (
                      <span className="text-[11px]" style={{ color: "var(--muted)" }}>~${m.estimatedDailyRental}/day</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRent(m)}
                  className="h-9 px-5 rounded-full text-[12px] font-medium tracking-wide flex-shrink-0 transition-all duration-200 hover:opacity-90 active:scale-95"
                  style={{ background: "var(--fg)", color: "var(--bg)" }}
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
