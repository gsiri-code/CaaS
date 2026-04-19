"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Photo = {
  id: string;
  photoId: string;
  fileUrl: string;
  cropBbox: { x: number; y: number; w: number; h: number } | null;
};

type Garment = {
  id: string;
  category: string;
  subcategory: string | null;
  colorPrimary: string | null;
  colorSecondary: string | null;
  pattern: string | null;
  silhouette: string | null;
  brandGuess: string | null;
  description: string;
  heroImageUrl: string;
  wearCount: number;
  lastWornAt: string | null;
  estimatedValueUsd: number | null;
  vault: boolean;
  photos: Photo[];
};

function timeAgo(date: string | null) {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

export default function GarmentDetail({
  id,
  as,
}: {
  id: string;
  as: "alice" | "bob";
}) {
  const router = useRouter();
  const [garment, setGarment] = useState<Garment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/closet/${id}?as=${as}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data) => {
        setGarment(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, as]);

  async function toggleVault() {
    if (!garment) return;
    const res = await fetch(`/api/closet/${id}?as=${as}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vault: !garment.vault }),
    });
    if (res.ok) {
      setGarment((g) => (g ? { ...g, vault: !g.vault } : g));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[14px] text-[#999]">
        Loading...
      </div>
    );
  }

  if (!garment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2">
        <p className="text-[14px] text-[#999]">Garment not found</p>
        <button
          onClick={() => router.back()}
          className="text-[14px] text-black underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const tags = [
    garment.brandGuess,
    garment.subcategory || garment.category,
    garment.colorPrimary,
    garment.pattern,
  ].filter(Boolean);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Back nav */}
      <div className="px-6 pt-14 pb-2">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[15px]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
      </div>

      {/* Hero Image */}
      <div className="px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={garment.heroImageUrl}
          alt={garment.category}
          className="w-full aspect-square rounded-lg object-cover bg-[#F0F0F0]"
        />
      </div>

      {/* Source Photos */}
      {garment.photos.length > 0 && (
        <div className="px-6 pt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {garment.photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.id}
              src={p.fileUrl}
              alt="source"
              className="w-12 h-12 rounded object-cover bg-[#E8E8E8] flex-shrink-0"
            />
          ))}
        </div>
      )}

      {/* Title + Tags */}
      <div className="px-6 pt-4">
        <h1 className="text-[22px] font-semibold">
          {garment.subcategory || garment.category}
        </h1>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 rounded bg-[#F5F5F5] text-[13px] text-[#555] capitalize"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Vault Toggle */}
      <div className="px-6 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[15px] font-medium">Vault</p>
            <p className="text-[13px] text-[#757575] mt-0.5">
              {garment.vault
                ? "This item is vaulted — not available for rent"
                : "Friends can rent this item"}
            </p>
          </div>
          <button
            onClick={toggleVault}
            className={`w-11 h-[26px] rounded-full relative transition-colors ${
              garment.vault ? "bg-black" : "bg-black/15"
            }`}
          >
            <div
              className={`absolute top-[2px] w-[22px] h-[22px] rounded-full bg-white shadow-sm transition-transform ${
                garment.vault ? "left-[24px]" : "left-[2px]"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 pt-5 pb-8 flex gap-8">
        <div>
          <p className="text-[12px] text-[#999]">Est. Value</p>
          <p className="text-[20px] font-semibold mt-0.5">
            {garment.estimatedValueUsd ? `$${garment.estimatedValueUsd}` : "—"}
          </p>
        </div>
        <div>
          <p className="text-[12px] text-[#999]">Worn</p>
          <p className="text-[20px] font-semibold mt-0.5">{garment.wearCount}x</p>
        </div>
        <div>
          <p className="text-[12px] text-[#999]">Last Worn</p>
          <p className="text-[20px] font-semibold mt-0.5">
            {timeAgo(garment.lastWornAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
