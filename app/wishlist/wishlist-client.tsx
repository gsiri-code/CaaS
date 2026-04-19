"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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

export default function WishlistClient({ asKey }: { asKey: "alice" | "bob" }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [requesting, setRequesting] = useState<string | null>(null);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("");
  const [maxPrice, setMaxPrice] = useState("");
  const [refFile, setRefFile] = useState<File | null>(null);
  const [saveToWishlist, setSaveToWishlist] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

        const searchRes = await fetch("/api/search/friend-closets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            as: asKey,
            query_text: query.trim() || undefined,
            reference_image_base64: refBase64,
            category: category || undefined,
            limit: 15,
          }),
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
    <div className="mt-6 space-y-6">
      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="text-xs text-black/60 dark:text-white/60">
            describe what you want
          </span>
          <input
            type="text"
            placeholder="red floral midi dress"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mt-1 block w-full rounded border border-black/15 dark:border-white/15 bg-transparent px-3 py-2"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <label className="block flex-1 min-w-[140px]">
            <span className="text-xs text-black/60 dark:text-white/60">category (optional)</span>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as (typeof CATEGORIES)[number])
              }
              className="mt-1 block w-full rounded border border-black/15 dark:border-white/15 bg-transparent px-2 py-1.5"
            >
              {CATEGORIES.map((c) => (
                <option key={c || "any"} value={c}>
                  {c || "any"}
                </option>
              ))}
            </select>
          </label>

          <label className="block flex-1 min-w-[140px]">
            <span className="text-xs text-black/60 dark:text-white/60">max price / day ($)</span>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="mt-1 block w-full rounded border border-black/15 dark:border-white/15 bg-transparent px-2 py-1.5"
            />
          </label>

          <label className="block flex-1 min-w-[140px]">
            <span className="text-xs text-black/60 dark:text-white/60">reference image (optional)</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setRefFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-xs"
            />
          </label>
        </div>

        <label className="inline-flex items-center gap-2 text-xs text-black/60 dark:text-white/60">
          <input
            type="checkbox"
            checked={saveToWishlist}
            onChange={(e) => setSaveToWishlist(e.target.checked)}
          />
          save this query to my wishlist
        </label>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={run}
            disabled={pending}
            className="px-4 py-1.5 rounded bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
          >
            {pending ? "searching…" : "search friends"}
          </button>
          {error && <span className="text-xs text-red-600">error: {error}</span>}
        </div>
      </div>

      {matches && (
        <div>
          <p className="text-xs uppercase tracking-wider text-black/50 dark:text-white/50 mb-3">
            {matches.length} match{matches.length === 1 ? "" : "es"}
          </p>
          {matches.length === 0 ? (
            <p className="text-sm text-black/60 dark:text-white/60">
              Nothing found. Try broadening the query or adding a reference image.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {matches.map((m) => (
                <div
                  key={m.garment.id}
                  className="rounded border border-black/10 dark:border-white/10 overflow-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.garment.heroImageUrl}
                    alt={m.garment.subcategory ?? m.garment.category}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="px-2 py-1.5 text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="capitalize font-medium">
                        {m.garment.subcategory ?? m.garment.category}
                      </span>
                      <span className="text-black/50 dark:text-white/50">
                        {(1 - m.score).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-black/50 dark:text-white/50 capitalize">
                      {[m.garment.colorPrimary, m.garment.brandGuess].filter(Boolean).join(" · ")}
                    </div>
                    <div className="text-black/50 dark:text-white/50">
                      owned by {m.owner.name}
                    </div>
                    <button
                      type="button"
                      disabled={requesting === m.garment.id}
                      className="mt-1 w-full px-2 py-1 rounded border border-black/15 dark:border-white/15 text-xs hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40"
                      onClick={async () => {
                        setRequesting(m.garment.id);
                        try {
                          const res = await fetch("/api/negotiations/start", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              as: asKey,
                              garment_id: m.garment.id,
                              max_price_usd: maxPrice ? Number(maxPrice) : undefined,
                            }),
                          });
                          if (!res.ok) throw new Error(await res.text());
                          const data = (await res.json()) as { negotiation_id: string };
                          router.push(
                            `/negotiations/${data.negotiation_id}?as=${asKey}`,
                          );
                        } catch (e) {
                          alert(`failed to start: ${e instanceof Error ? e.message : e}`);
                          setRequesting(null);
                        }
                      }}
                    >
                      {requesting === m.garment.id ? "starting…" : "request rental"}
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
