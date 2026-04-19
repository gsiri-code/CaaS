"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Garment = {
  id: string;
  category: string;
  subcategory: string | null;
  brandGuess: string | null;
  heroImageUrl: string;
  vault: boolean;
  estimatedValueUsd: number | null;
};

const CATEGORIES = ["All", "Tops", "Bottoms", "Dresses", "Shoes", "Outerwear"];

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

  useEffect(() => {
    setLoading(true);
    fetch(`/api/closet?as=${as}`)
      .then((r) => r.json())
      .then((data) => {
        setGarments(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [as]);

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
              <Link
                key={g.id}
                href={`/closet/${g.id}`}
                className="no-underline text-black"
              >
                <div className="rounded overflow-hidden">
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
                  <div className="pt-2">
                    <p className="text-[14px] font-medium capitalize leading-tight truncate">
                      {g.subcategory || g.category}
                    </p>
                    <p className="text-[12px] text-[#757575] mt-0.5 truncate">
                      {g.brandGuess ?? g.category}
                      {g.vault ? " · Vaulted" : ""}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
