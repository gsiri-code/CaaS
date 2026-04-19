"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useOutsideClick } from "@/hooks/use-outside-click";
import type {
  ClosetGarmentMock as Garment,
  ClosetGarmentResponse,
  GarmentDetailMock,
  GarmentDetailResponse,
} from "@/lib/mock-fixtures";

const CATEGORIES = ["All", "Tops", "Bottoms", "Dresses", "Shoes", "Outerwear"];

function timeAgo(date: string | null) {
  if (!date) return "\u2014";
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

export default function ClosetClient({
  userName,
  as,
}: {
  userName: string;
  as: "alice" | "bob";
}) {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<(Garment & { detail?: GarmentDetailMock }) | null>(null);
  const id = useId();
  const expandedRef = useRef<HTMLDivElement>(null);

  useOutsideClick(expandedRef, () => setActive(null));

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActive(null);
    }
    if (active) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/closet?as=${as}`)
      .then((r) => r.json())
      .then((data: ClosetGarmentResponse) => {
        if (cancelled) return;
        setGarments(data);
        setLoading(false);
      })
      .catch(() => { if (cancelled) return; setLoading(false); });
    return () => { cancelled = true; };
  }, [as]);

  async function handleCardClick(g: Garment) {
    setActive(g);
    try {
      const res = await fetch(`/api/closet/${g.id}?as=${as}`);
      if (res.ok) {
        const detail: GarmentDetailResponse = await res.json();
        setActive((prev) => (prev?.id === g.id ? { ...prev, detail } : prev));
      }
    } catch { /* detail fetch failed */ }
  }

  async function toggleVault() {
    if (!active) return;
    const res = await fetch(`/api/closet/${active.id}?as=${as}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vault: !active.vault }),
    });
    if (res.ok) {
      const newVault = !active.vault;
      setActive((a) => a ? { ...a, vault: newVault, detail: a.detail ? { ...a.detail, vault: newVault } : a.detail } : a);
      setGarments((gs) => gs.map((g) => g.id === active.id ? { ...g, vault: newVault } : g));
    }
  }

  const filtered = garments.filter((g) => {
    if (filter !== "All") {
      const cat = g.category.toLowerCase();
      const fl = filter.toLowerCase();
      if (fl === "tops" && !["top", "tops", "blouse", "shirt", "sweater", "tee"].some((k) => cat.includes(k))) return false;
      if (fl === "bottoms" && !["bottom", "bottoms", "pants", "jeans", "shorts", "skirt"].some((k) => cat.includes(k))) return false;
      if (fl === "dresses" && !cat.includes("dress")) return false;
      if (fl === "shoes" && !["shoe", "shoes", "sneaker", "boot", "sandal"].some((k) => cat.includes(k))) return false;
      if (fl === "outerwear" && !["coat", "jacket", "outerwear", "blazer", "cardigan"].some((k) => cat.includes(k))) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const s = `${g.category} ${g.subcategory ?? ""} ${g.brandGuess ?? ""}`.toLowerCase();
      if (!s.includes(q)) return false;
    }
    return true;
  });

  const detail = active?.detail;
  const tags = detail
    ? [detail.brandGuess, detail.subcategory || detail.category, detail.colorPrimary, detail.pattern].filter(Boolean)
    : active ? [active.brandGuess, active.subcategory || active.category].filter(Boolean) : [];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-6 pt-16 pb-2 flex items-end justify-between animate-fade-up">
        <div>
          <p className="text-[11px] tracking-[0.2em] uppercase mb-2" style={{ color: "var(--accent)" }}>Collection</p>
          <h1 className="text-[30px] leading-[1.1] font-light tracking-[-0.02em]" style={{ fontFamily: "var(--font-serif)" }}>
            {userName}&apos;s Closet
          </h1>
        </div>
        <div className="flex -space-x-2 mb-1.5">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--bg)]" style={{ background: "linear-gradient(135deg, #E8D5C4, #D4C0AE)" }} />
          <div className="w-8 h-8 rounded-full border-2 border-[var(--bg)]" style={{ background: "linear-gradient(135deg, #C4D5E8, #AEC0D4)" }} />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="px-6 py-3 flex gap-2 overflow-x-auto no-scrollbar animate-fade-up" style={{ animationDelay: "0.05s" }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className="h-8 px-4 rounded-full text-[12px] tracking-wide uppercase whitespace-nowrap transition-all duration-200"
            style={{
              background: filter === cat ? "var(--fg)" : "transparent",
              color: filter === cat ? "var(--bg)" : "var(--muted)",
              border: filter === cat ? "none" : "1px solid var(--border-strong)",
              fontWeight: filter === cat ? 600 : 400,
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-6 pt-1 pb-4 animate-fade-up" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-center h-11 rounded-xl px-4 gap-3" style={{ background: "var(--surface)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search closet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[14px] outline-none"
            style={{ color: "var(--fg)" }}
          />
        </div>
      </div>

      {/* Backdrop */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-10"
            style={{ background: "rgba(26, 24, 22, 0.3)", backdropFilter: "blur(8px)" }}
          />
        )}
      </AnimatePresence>

      {/* Expanded Card */}
      <AnimatePresence>
        {active && (
          <div className="fixed inset-0 grid place-items-center z-[100] p-4">
            <motion.button
              key={`close-${active.id}-${id}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              className="absolute top-5 right-5 flex items-center justify-center w-9 h-9 rounded-full z-10 backdrop-blur-md transition-colors"
              style={{ background: "rgba(255,255,255,0.8)", border: "1px solid var(--border)" }}
              onClick={() => setActive(null)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg)" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18" /><path d="M6 6l12 12" />
              </svg>
            </motion.button>

            <motion.div
              layoutId={`card-${active.id}-${id}`}
              ref={expandedRef}
              className="w-full max-w-[500px] h-full md:h-fit md:max-h-[90%] flex flex-col overflow-y-auto sm:rounded-2xl"
              style={{ background: "var(--bg)", boxShadow: "var(--shadow-lg)" }}
            >
              <motion.div layoutId={`image-${active.id}-${id}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={active.heroImageUrl} alt={active.category} className="w-full aspect-square object-cover" style={{ background: "var(--surface)" }} />
              </motion.div>

              {detail && detail.photos.length > 0 && (
                <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-5 pt-4 flex gap-2 overflow-x-auto no-scrollbar">
                  {detail.photos.map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={p.id} src={p.fileUrl} alt="source" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" style={{ background: "var(--surface)" }} />
                  ))}
                </motion.div>
              )}

              <div className="p-5 pt-4">
                <motion.h3 layoutId={`title-${active.id}-${id}`} className="text-[22px] font-light tracking-[-0.01em]" style={{ fontFamily: "var(--font-serif)" }}>
                  {active.subcategory || active.category}
                </motion.h3>
                <motion.p layoutId={`brand-${active.id}-${id}`} className="text-[12px] mt-1 tracking-wide" style={{ color: "var(--muted)" }}>
                  {active.brandGuess ?? active.category}
                  {active.vault ? " \u00b7 Vaulted" : ""}
                </motion.p>

                <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-wrap gap-1.5 mt-4">
                  {tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 rounded-full text-[11px] tracking-wide capitalize" style={{ background: "var(--surface)", color: "var(--muted)" }}>
                      {tag}
                    </span>
                  ))}
                </motion.div>

                {/* Vault toggle */}
                <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-between mt-6 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
                  <div>
                    <p className="text-[14px] font-medium">Vault</p>
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--muted)" }}>
                      {active.vault ? "Not available for rent" : "Friends can rent this item"}
                    </p>
                  </div>
                  <button onClick={toggleVault} className="w-12 h-[28px] rounded-full relative transition-all duration-300" style={{ background: active.vault ? "var(--accent)" : "var(--border-strong)" }}>
                    <div className="absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white transition-all duration-300" style={{ left: active.vault ? "26px" : "3px", boxShadow: "var(--shadow-sm)" }} />
                  </button>
                </motion.div>

                {/* Stats */}
                <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-3 gap-4 mt-5 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
                  {[
                    { label: "Est. Value", value: active.estimatedValueUsd ? `$${active.estimatedValueUsd}` : "\u2014" },
                    { label: "Worn", value: `${active.wearCount}x` },
                    { label: "Last Worn", value: timeAgo(active.lastWornAt as string | null) },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <p className="text-[10px] tracking-[0.15em] uppercase" style={{ color: "var(--muted)" }}>{stat.label}</p>
                      <p className="text-[20px] font-light mt-1" style={{ fontFamily: "var(--font-serif)" }}>{stat.value}</p>
                    </div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <div className="px-6 pb-4 flex-1">
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="animate-fade-up" style={{ animationDelay: `${0.05 * i}s` }}>
                <div className="aspect-[4/5] rounded-xl animate-shimmer" />
                <div className="mt-2.5 h-3 w-24 rounded animate-shimmer" />
                <div className="mt-1.5 h-2.5 w-16 rounded animate-shimmer" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 animate-fade-up">
            <p className="text-[24px] font-light" style={{ fontFamily: "var(--font-serif)", color: "var(--muted)" }}>
              {garments.length === 0 ? "Your closet awaits" : "No matches found"}
            </p>
            <p className="text-[13px] mt-2" style={{ color: "var(--muted)" }}>
              {garments.length === 0 ? "Import your first garments to get started." : "Try adjusting your filters."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map((g, i) => (
              <motion.div
                layoutId={`card-${g.id}-${id}`}
                key={g.id}
                onClick={() => handleCardClick(g)}
                className="cursor-pointer group animate-fade-up"
                style={{ animationDelay: `${0.04 * i}s` }}
              >
                <motion.div layoutId={`image-${g.id}-${id}`}>
                  <div className="relative overflow-hidden rounded-xl" style={{ boxShadow: "var(--shadow-sm)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.heroImageUrl} alt={g.category} className="w-full aspect-[4/5] object-cover transition-transform duration-700 group-hover:scale-105" style={{ background: "var(--surface)" }} />
                    {g.vault && (
                      <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md" style={{ background: "rgba(255,255,255,0.8)" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--accent)" stroke="none">
                          <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </motion.div>
                <div className="pt-2.5 px-0.5">
                  <motion.p layoutId={`title-${g.id}-${id}`} className="text-[14px] font-medium capitalize leading-tight truncate">
                    {g.subcategory || g.category}
                  </motion.p>
                  <motion.p layoutId={`brand-${g.id}-${id}`} className="text-[11px] mt-0.5 truncate tracking-wide" style={{ color: "var(--muted)" }}>
                    {g.brandGuess ?? g.category}
                    {g.vault ? " \u00b7 Vaulted" : ""}
                  </motion.p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
