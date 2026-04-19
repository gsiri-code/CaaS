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
  if (!date) return "—";
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
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [as]);

  async function handleCardClick(g: Garment) {
    setActive(g);
    // Fetch detail data for expanded view
    try {
      const res = await fetch(`/api/closet/${g.id}?as=${as}`);
      if (res.ok) {
        const detail: GarmentDetailResponse = await res.json();
        setActive((prev) => (prev?.id === g.id ? { ...prev, detail } : prev));
      }
    } catch {
      // detail fetch failed, expanded card still shows basic info
    }
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
      const filterLower = filter.toLowerCase();
      if (filterLower === "tops" && !["top", "tops", "blouse", "shirt", "sweater", "tee"].some((k) => cat.includes(k))) return false;
      if (filterLower === "bottoms" && !["bottom", "bottoms", "pants", "jeans", "shorts", "skirt"].some((k) => cat.includes(k))) return false;
      if (filterLower === "dresses" && !cat.includes("dress")) return false;
      if (filterLower === "shoes" && !["shoe", "shoes", "sneaker", "boot", "sandal"].some((k) => cat.includes(k))) return false;
      if (filterLower === "outerwear" && !["coat", "jacket", "outerwear", "blazer", "cardigan"].some((k) => cat.includes(k))) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const searchable = `${g.category} ${g.subcategory ?? ""} ${g.brandGuess ?? ""}`.toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  const detail = active?.detail;
  const tags = detail
    ? [detail.brandGuess, detail.subcategory || detail.category, detail.colorPrimary, detail.pattern].filter(Boolean)
    : active
      ? [active.brandGuess, active.subcategory || active.category].filter(Boolean)
      : [];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-6 pt-14 pb-2 flex items-center justify-between">
        <h1 className="text-[22px] font-semibold">{userName}&apos;s Closet</h1>
        <div className="flex -space-x-2">
          <div className="w-7 h-7 rounded-full bg-[#E8D5C4] border-2 border-white" />
          <div className="w-7 h-7 rounded-full bg-[#C4D5E8] border-2 border-white" />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="px-6 py-3 flex gap-2 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`h-8 px-3.5 rounded text-[14px] font-medium whitespace-nowrap transition-colors ${
              filter === cat
                ? "bg-black text-white"
                : "bg-transparent text-black/60 border border-black/10"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-6 pt-1 pb-3">
        <div className="flex items-center h-10 rounded-lg bg-[#F8F8F8] px-3 gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search closet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#999]"
          />
        </div>
      </div>

      {/* Backdrop overlay */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-10"
          />
        )}
      </AnimatePresence>

      {/* Expanded card */}
      <AnimatePresence>
        {active && (
          <div className="fixed inset-0 grid place-items-center z-[100]">
            <motion.button
              key={`close-${active.id}-${id}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              className="absolute top-4 right-4 flex items-center justify-center bg-white rounded-full h-8 w-8 shadow-sm z-10"
              onClick={() => setActive(null)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </motion.button>

            <motion.div
              layoutId={`card-${active.id}-${id}`}
              ref={expandedRef}
              className="w-full max-w-[500px] h-full md:h-fit md:max-h-[90%] flex flex-col bg-white sm:rounded-3xl overflow-y-auto"
            >
              <motion.div layoutId={`image-${active.id}-${id}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={active.heroImageUrl}
                  alt={active.category}
                  className="w-full aspect-square object-cover bg-[#F0F0F0]"
                />
              </motion.div>

              {/* Source Photos */}
              {detail && detail.photos.length > 0 && (
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-5 pt-3 flex gap-2 overflow-x-auto no-scrollbar"
                >
                  {detail.photos.map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={p.id}
                      src={p.fileUrl}
                      alt="source"
                      className="w-12 h-12 rounded object-cover bg-[#E8E8E8] flex-shrink-0"
                    />
                  ))}
                </motion.div>
              )}

              <div className="p-5">
                {/* Title */}
                <motion.h3
                  layoutId={`title-${active.id}-${id}`}
                  className="text-[20px] font-semibold"
                >
                  {active.subcategory || active.category}
                </motion.h3>
                <motion.p
                  layoutId={`brand-${active.id}-${id}`}
                  className="text-[13px] text-[#757575] mt-0.5"
                >
                  {active.brandGuess ?? active.category}
                  {active.vault ? " · Vaulted" : ""}
                </motion.p>

                {/* Tags */}
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-wrap gap-1.5 mt-3"
                >
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded bg-[#F5F5F5] text-[12px] text-[#555] capitalize"
                    >
                      {tag}
                    </span>
                  ))}
                </motion.div>

                {/* Vault Toggle */}
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-between mt-5"
                >
                  <div>
                    <p className="text-[14px] font-medium">Vault</p>
                    <p className="text-[12px] text-[#757575] mt-0.5">
                      {active.vault
                        ? "Not available for rent"
                        : "Friends can rent this item"}
                    </p>
                  </div>
                  <button
                    onClick={toggleVault}
                    className={`w-11 h-[26px] rounded-full relative transition-colors ${
                      active.vault ? "bg-black" : "bg-black/15"
                    }`}
                  >
                    <div
                      className={`absolute top-[2px] w-[22px] h-[22px] rounded-full bg-white shadow-sm transition-transform ${
                        active.vault ? "left-[24px]" : "left-[2px]"
                      }`}
                    />
                  </button>
                </motion.div>

                {/* Stats */}
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex gap-8 mt-5 pt-4 border-t border-black/6"
                >
                  <div>
                    <p className="text-[11px] text-[#999]">Est. Value</p>
                    <p className="text-[18px] font-semibold mt-0.5">
                      {active.estimatedValueUsd ? `$${active.estimatedValueUsd}` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#999]">Worn</p>
                    <p className="text-[18px] font-semibold mt-0.5">{active.wearCount}x</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#999]">Last Worn</p>
                    <p className="text-[18px] font-semibold mt-0.5">
                      {timeAgo(active.lastWornAt as string | null)}
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <div className="px-6 pb-4 flex-1">
        {loading ? (
          <div className="text-center text-[14px] text-[#999] py-12">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-[14px] text-[#999] py-12">
            {garments.length === 0
              ? "No garments yet. Import your closet first!"
              : "No items match your filter."}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map((g) => (
              <motion.div
                layoutId={`card-${g.id}-${id}`}
                key={g.id}
                onClick={() => handleCardClick(g)}
                className="cursor-pointer rounded overflow-hidden"
              >
                <motion.div layoutId={`image-${g.id}-${id}`}>
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={g.heroImageUrl}
                      alt={g.category}
                      className="w-full aspect-[163/200] object-cover bg-[#F0F0F0]"
                    />
                    {g.vault && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2">
                          <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </motion.div>
                <div className="pt-2">
                  <motion.p
                    layoutId={`title-${g.id}-${id}`}
                    className="text-[14px] font-medium capitalize leading-tight truncate"
                  >
                    {g.subcategory || g.category}
                  </motion.p>
                  <motion.p
                    layoutId={`brand-${g.id}-${id}`}
                    className="text-[12px] text-[#757575] mt-0.5 truncate"
                  >
                    {g.brandGuess ?? g.category}
                    {g.vault ? " · Vaulted" : ""}
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
