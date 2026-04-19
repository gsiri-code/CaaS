"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DemoUserKey } from "@/lib/session";

type Match = {
  garment: {
    id: string;
    category: string;
    subcategory: string | null;
    colorPrimary: string | null;
    brandGuess: string | null;
    description: string;
    heroImageUrl: string;
  };
  owner: { id: string; name: string; email: string };
  textDistance: number | null;
  imageDistance: number | null;
  score: number;
};

const CATEGORIES = ["", "top", "bottom", "dress", "outerwear", "shoe", "accessory"] as const;

export default function WishlistClient({ asKey }: { asKey: DemoUserKey }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("");
  const [maxPrice, setMaxPrice] = useState("");
  const [refFile, setRefFile] = useState<File | null>(null);
  const [saveToWishlist, setSaveToWishlist] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const run = useCallback(() => {
    if (!query.trim() && !refFile) {
      setError("enter text or choose a reference image");
      return;
    }
    setError(null);
    setMatches(null);
    startTransition(async () => {
      try {
        let refBase64: string | undefined;
        if (refFile) {
          const arr = new Uint8Array(await refFile.arrayBuffer());
          refBase64 = btoa(String.fromCharCode(...arr));
        }

        const sessionBody = {
          as: asKey,
          query_text: query.trim() || undefined,
          reference_image_base64: refBase64,
          category: category || undefined,
          limit: 15,
        };

        const searchRes = await fetch("/api/search/friend-closets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sessionBody),
        });
        if (!searchRes.ok) {
          throw new Error(`search ${searchRes.status}: ${await searchRes.text()}`);
        }
        const data = (await searchRes.json()) as { matches: Match[] };
        setMatches(data.matches);

        if (saveToWishlist && query.trim()) {
          await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              as: asKey,
              query_text: query.trim(),
              reference_image_base64: refBase64,
              max_rental_price_usd: maxPrice ? Number(maxPrice) : undefined,
            }),
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }, [asKey, query, category, maxPrice, refFile, saveToWishlist]);

  return (
    <div className="px-6 pt-6 space-y-8">
      {/* Search form */}
      <div
        className="rounded-2xl p-6 space-y-5 animate-fade-up"
        style={{ background: "var(--surface)", boxShadow: "var(--shadow-editorial)", animationDelay: "0.08s" }}
      >
        <div>
          <label className="label-mono block mb-2" style={{ color: "var(--muted)" }}>
            Describe what you want
          </label>
          <input
            type="text"
            placeholder="red floral midi dress"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-editorial"
            style={{ background: "var(--bg)" }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label-mono block mb-2" style={{ color: "var(--muted)" }}>
              Category
            </label>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as (typeof CATEGORIES)[number])
              }
              className="input-editorial capitalize"
              style={{ background: "var(--bg)" }}
            >
              {CATEGORIES.map((c) => (
                <option key={c || "any"} value={c}>
                  {c || "any"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-mono block mb-2" style={{ color: "var(--muted)" }}>
              Max price / day
            </label>
            <input
              type="number"
              placeholder="$"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="input-editorial"
              style={{ background: "var(--bg)" }}
            />
          </div>

          <div>
            <label className="label-mono block mb-2" style={{ color: "var(--muted)" }}>
              Reference image
            </label>
            <div
              className="input-editorial flex items-center cursor-pointer"
              style={{ background: "var(--bg)", padding: "8px 14px" }}
              onClick={() => document.getElementById("ref-file-input")?.click()}
            >
              <span className="text-[13px] truncate" style={{ color: refFile ? "var(--fg)" : "var(--muted)", opacity: refFile ? 1 : 0.6 }}>
                {refFile ? refFile.name : "Choose file\u2026"}
              </span>
            </div>
            <input
              id="ref-file-input"
              type="file"
              accept="image/*"
              onChange={(e) => setRefFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <label
            className="flex items-center gap-2.5 text-[12px] tracking-wide cursor-pointer"
            style={{ color: "var(--muted)" }}
          >
            <input
              type="checkbox"
              checked={saveToWishlist}
              onChange={(e) => setSaveToWishlist(e.target.checked)}
              className="w-4 h-4 rounded accent-black"
            />
            Save to wishlist
          </label>

          <button
            type="button"
            onClick={run}
            disabled={pending}
            className="btn-primary"
          >
            {pending ? "Searching\u2026" : "Search Friends"}
          </button>
        </div>

        {error && (
          <p className="text-[12px]" style={{ color: "var(--error)" }}>
            {error}
          </p>
        )}
      </div>

      {/* Results */}
      {matches && (
        <div className="animate-fade-up">
          <p className="label-mono mb-5" style={{ color: "var(--muted)" }}>
            {matches.length} match{matches.length === 1 ? "" : "es"}
          </p>
          {matches.length === 0 ? (
            <div className="text-center py-16">
              <p className="section-header text-[24px]" style={{ color: "var(--muted)" }}>
                Nothing found
              </p>
              <p className="text-[13px] mt-3" style={{ color: "var(--muted)" }}>
                Try broadening the query or adding a reference image.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
              {matches.map((m, i) => (
                <div
                  key={m.garment.id}
                  className="card-editorial animate-fade-up"
                  style={{ animationDelay: `${0.04 * Math.min(i, 12)}s` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.garment.heroImageUrl}
                    alt={m.garment.subcategory ?? m.garment.category}
                    className="w-full aspect-[4/5] object-cover"
                    style={{ background: "var(--surface)" }}
                  />
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className="text-[15px] font-medium capitalize"
                        style={{ fontFamily: "var(--font-serif)" }}
                      >
                        {m.garment.subcategory ?? m.garment.category}
                      </span>
                      <span
                        className="label-mono"
                        style={{ color: "var(--muted)", fontSize: "9px" }}
                      >
                        {Math.round((1 - m.score) * 100)}%
                      </span>
                    </div>
                    <p className="text-[11px] capitalize tracking-wide" style={{ color: "var(--muted)" }}>
                      {[m.garment.colorPrimary, m.garment.brandGuess].filter(Boolean).join(" \u00b7 ")}
                    </p>
                    <p className="text-[11px] tracking-wide" style={{ color: "var(--muted)" }}>
                      {m.owner.name}&rsquo;s closet
                    </p>
                    <button
                      type="button"
                      className="btn-secondary w-full !h-9 !text-[11px] !tracking-wide mt-1"
                      disabled={requestingId === m.garment.id}
                      onClick={async () => {
                        setRequestingId(m.garment.id);
                        try {
                          const res = await fetch(`/api/negotiations?as=${asKey}`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              garmentId: m.garment.id,
                              ownerId: m.owner.id,
                            }),
                          });
                          if (!res.ok) {
                            const data = await res.json().catch(() => ({}));
                            throw new Error(data.error ?? `Failed (${res.status})`);
                          }
                          router.push(`/negotiations?as=${asKey}`);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : String(e));
                          setRequestingId(null);
                        }
                      }}
                    >
                      {requestingId === m.garment.id ? "Creating\u2026" : "Request Rental"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
