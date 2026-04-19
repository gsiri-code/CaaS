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
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  const deleteGarment = useCallback(async (id: string) => {
    if (!confirm("Delete this garment? This cannot be undone.")) return;
    setDeletingId(id);
    setError(null);
    try {
      const href = asKey ? `/api/closet/${id}?as=${asKey}` : `/api/closet/${id}`;
      const res = await fetch(href, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : `HTTP ${res.status}`);
      }
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeletingId(null);
    }
  }, [asKey, router]);

  return (
    <div>
      {/* Merge toolbar */}
      {selected.size > 0 && (
        <div
          className="sticky top-3 z-10 glass rounded-2xl px-5 py-3 mb-5 flex items-center gap-3 animate-fade-up"
          style={{ boxShadow: "var(--shadow-md)" }}
        >
          <span className="text-[13px] font-medium tracking-wide">
            {selected.size} selected
          </span>
          <div className="flex-1" />
          <button
            type="button"
            disabled={selected.size !== 2 || busy}
            onClick={merge}
            className="btn-primary !h-9 !px-5 !text-[12px] !tracking-wide"
          >
            {busy ? "Merging\u2026" : "Merge Duplicates"}
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="btn-secondary !h-9 !px-4 !text-[12px]"
          >
            Clear
          </button>
          {error && (
            <span className="text-[12px]" style={{ color: "var(--error)" }}>
              {error}
            </span>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-20 animate-fade-up">
          <p
            className="section-header text-[26px]"
            style={{ color: "var(--muted)" }}
          >
            Your closet awaits
          </p>
          <p className="text-[13px] mt-3" style={{ color: "var(--muted)" }}>
            Import your first pieces on the{" "}
            <Link
              href={asKey ? `/ingest?as=${asKey}` : "/ingest"}
              className="underline"
              style={{ color: "var(--accent)" }}
            >
              Import
            </Link>{" "}
            page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-5">
          {items.map((g, i) => {
            const isSel = selected.has(g.id);
            return (
              <div
                key={g.id}
                className="animate-fade-up"
                style={{ animationDelay: `${0.04 * Math.min(i, 12)}s` }}
              >
                <div
                  className={`card-editorial relative ${
                    isSel ? "ring-2 ring-offset-2" : ""
                  }`}
                  style={isSel ? { ringColor: "var(--accent)" } as React.CSSProperties : undefined}
                >
                  <Link href={detailHref(g.id)} className="block no-underline">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={g.heroImageUrl}
                      alt={g.subcategory ?? g.category}
                      className="w-full aspect-[4/5] object-cover"
                      style={{ background: "var(--surface)" }}
                    />
                  </Link>

                  {/* Select checkbox */}
                  <button
                    type="button"
                    onClick={() => toggle(g.id)}
                    className="absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200"
                    style={{
                      background: isSel ? "var(--accent)" : "rgba(255,255,255,0.85)",
                      color: isSel ? "var(--bg)" : "var(--muted)",
                      backdropFilter: "blur(8px)",
                      border: isSel ? "none" : "1px solid var(--border)",
                      fontSize: "10px",
                    }}
                    aria-label={isSel ? "deselect" : "select for merge"}
                  >
                    {isSel ? "\u2713" : ""}
                  </button>

                  {/* Top-right badges */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {g.vault && (
                      <span
                        className="label-mono px-2 py-1 rounded-full"
                        style={{
                          background: "rgba(255,255,255,0.85)",
                          backdropFilter: "blur(8px)",
                          color: "var(--accent-deep)",
                          fontSize: "9px",
                        }}
                      >
                        Vault
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => void deleteGarment(g.id)}
                      disabled={deletingId === g.id}
                      className="px-2 py-1 rounded-full text-[9px] tracking-wide uppercase transition-all duration-200 hover:opacity-80 disabled:opacity-50"
                      style={{
                        background: "rgba(255,255,255,0.85)",
                        backdropFilter: "blur(8px)",
                        color: "var(--error)",
                        border: "1px solid rgba(181, 56, 59, 0.15)",
                      }}
                      aria-label="delete garment"
                    >
                      {deletingId === g.id ? "\u2026" : "Delete"}
                    </button>
                  </div>
                </div>

                {/* Card text */}
                <div className="pt-3 px-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className="text-[15px] font-medium capitalize leading-tight"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {g.subcategory ?? g.category}
                    </p>
                    {g.brandGuess && (
                      <p
                        className="text-[11px] tracking-wide truncate"
                        style={{ color: "var(--muted)" }}
                      >
                        {g.brandGuess}
                      </p>
                    )}
                  </div>
                  {(g.colorPrimary || g.pattern) && (
                    <p
                      className="text-[11px] mt-1 capitalize tracking-wide"
                      style={{ color: "var(--muted)" }}
                    >
                      {[g.colorPrimary, g.pattern].filter(Boolean).join(" \u00b7 ")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
