"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  category: string;
  subcategory: string | null;
  colorPrimary: string | null;
  pattern: string | null;
  brandGuess: string | null;
  heroImageUrl: string;
  vault: boolean;
};

export default function ClosetGrid({ items, asKey }: { items: Item[]; asKey: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 2) next.add(id);
      else {
        next.clear();
        next.add(id);
      }
      return next;
    });
  }, []);

  const merge = useCallback(async () => {
    if (selected.size !== 2) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ingest/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ garment_ids: Array.from(selected) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [selected, router]);

  const detailHref = (id: string) =>
    asKey ? `/closet/${id}?as=${asKey}` : `/closet/${id}`;

  return (
    <div className="mt-4">
      {selected.size > 0 && (
        <div className="sticky top-0 z-10 bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded px-3 py-2 mb-3 flex items-center gap-3 text-sm">
          <span>{selected.size} selected</span>
          <button
            type="button"
            disabled={selected.size !== 2 || busy}
            onClick={merge}
            className="px-3 py-1 rounded bg-black text-white dark:bg-white dark:text-black disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? "merging…" : "merge 2 duplicates"}
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="px-3 py-1 rounded border border-black/15 dark:border-white/15"
          >
            clear
          </button>
          {error && <span className="text-red-600">error: {error}</span>}
        </div>
      )}

      {items.length === 0 ? (
        <p className="mt-8 text-sm text-black/60 dark:text-white/60">
          No garments yet. Drop photos on the <Link href="/ingest" className="underline">Ingest</Link> page.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {items.map((g) => {
            const isSel = selected.has(g.id);
            return (
              <div
                key={g.id}
                className={`relative rounded border overflow-hidden transition ${
                  isSel
                    ? "border-emerald-500 ring-2 ring-emerald-500"
                    : "border-black/10 dark:border-white/10"
                }`}
              >
                <Link href={detailHref(g.id)} className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.heroImageUrl}
                    alt={g.subcategory ?? g.category}
                    className="w-full aspect-square object-cover"
                  />
                </Link>
                <button
                  type="button"
                  onClick={() => toggle(g.id)}
                  className={`absolute top-2 left-2 h-5 w-5 rounded border text-[10px] flex items-center justify-center ${
                    isSel
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-white/80 dark:bg-black/60 border-black/20 dark:border-white/30"
                  }`}
                  aria-label={isSel ? "deselect" : "select for merge"}
                >
                  {isSel ? "✓" : ""}
                </button>
                {g.vault && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] bg-amber-500 text-white">
                    vault
                  </span>
                )}
                <div className="px-2 py-1.5 text-xs space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="capitalize font-medium">
                      {g.subcategory ?? g.category}
                    </span>
                    {g.brandGuess && (
                      <span className="text-black/50 dark:text-white/50 truncate ml-2">
                        {g.brandGuess}
                      </span>
                    )}
                  </div>
                  <div className="text-black/50 dark:text-white/50 capitalize">
                    {[g.colorPrimary, g.pattern].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
