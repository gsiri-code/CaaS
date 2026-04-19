"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  GarmentDetailMock as Garment,
  GarmentDetailResponse,
} from "@/lib/mock-fixtures";

function timeAgo(date: string | Date | null) {
  if (!date) return "—";
  const diff = Date.now() - (date instanceof Date ? date.getTime() : new Date(date).getTime());
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
      .then((data: GarmentDetailResponse) => {
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
      <div className="min-h-screen flex flex-col">
        <div className="px-6 pt-16 pb-3 animate-fade-up">
          <div className="w-20 h-4 rounded-full animate-shimmer" />
        </div>
        <div className="px-6 animate-fade-up" style={{ animationDelay: "0.05s" }}>
          <div className="aspect-square rounded-[28px] animate-shimmer" />
        </div>
        <div className="px-6 pt-4 flex gap-2 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-12 h-12 rounded-lg animate-shimmer" />
          ))}
        </div>
        <div className="px-6 pt-6 flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "0.15s" }}>
          <div className="h-8 w-2/3 rounded animate-shimmer" />
          <div className="h-4 w-1/3 rounded animate-shimmer" />
          <div className="flex gap-2 pt-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-8 w-20 rounded-full animate-shimmer" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!garment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center animate-fade-up">
        <p className="text-[26px] font-light" style={{ fontFamily: "var(--font-serif)", color: "var(--muted)" }}>
          Garment not found
        </p>
        <p className="text-[13px]" style={{ color: "var(--muted)" }}>
          This piece may have been removed from the closet.
        </p>
        <button
          onClick={() => router.back()}
          className="mt-2 h-11 px-5 rounded-full text-[13px] tracking-wide transition-all duration-200 hover:opacity-80"
          style={{ background: "var(--surface)", color: "var(--fg)", border: "1px solid var(--border)" }}
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
    garment.colorSecondary,
    garment.pattern,
    garment.silhouette,
  ].filter(Boolean);

  const stats = [
    { label: "Est. Value", value: garment.estimatedValueUsd ? `$${garment.estimatedValueUsd}` : "—" },
    { label: "Worn", value: `${garment.wearCount}x` },
    { label: "Last Worn", value: timeAgo(garment.lastWornAt) },
  ];

  return (
    <div className="min-h-screen flex flex-col pb-8">
      <div className="px-6 pt-16 pb-4 flex items-center gap-3 animate-fade-up">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[13px] tracking-wide transition-opacity hover:opacity-70"
          style={{ color: "var(--muted)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <div className="flex-1" />
        <span
          className="text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 rounded-full"
          style={{ background: garment.vault ? "var(--accent-soft)" : "var(--surface)", color: garment.vault ? "var(--accent)" : "var(--muted)" }}
        >
          {garment.vault ? "Vaulted" : "Available"}
        </span>
      </div>

      <div className="px-6 animate-fade-up" style={{ animationDelay: "0.05s" }}>
        <div className="relative overflow-hidden rounded-[28px]" style={{ boxShadow: "var(--shadow-lg)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={garment.heroImageUrl}
            alt={garment.category}
            className="w-full aspect-square object-cover"
            style={{ background: "var(--surface)" }}
          />
          <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/45 via-black/10 to-transparent">
            <p className="text-[11px] tracking-[0.22em] uppercase text-white/75">Closet piece</p>
            <h1 className="text-[30px] leading-[1.02] font-light text-white mt-2" style={{ fontFamily: "var(--font-serif)" }}>
              {garment.subcategory || garment.category}
            </h1>
            <p className="text-[12px] tracking-wide text-white/80 mt-1">
              {garment.brandGuess ?? garment.category}
            </p>
          </div>
        </div>
      </div>

      {garment.photos.length > 0 && (
        <div className="px-6 pt-4 flex gap-2.5 overflow-x-auto no-scrollbar animate-fade-up" style={{ animationDelay: "0.1s" }}>
          {garment.photos.map((p, i) => (
            <div key={p.id} className="relative rounded-xl overflow-hidden flex-shrink-0 animate-fade-up" style={{ animationDelay: `${0.04 * i}s` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.fileUrl}
                alt="source"
                className="w-14 h-14 object-cover"
                style={{ background: "var(--surface-hover)" }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="px-6 pt-6 animate-fade-up" style={{ animationDelay: "0.15s" }}>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1.5 rounded-full text-[11px] tracking-wide capitalize"
              style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }}
            >
              {tag}
            </span>
          ))}
        </div>

        {garment.description && (
          <p className="mt-5 text-[14px] leading-[1.75]" style={{ color: "var(--fg)" }}>
            {garment.description}
          </p>
        )}
      </div>

      <div className="px-6 pt-6 animate-fade-up" style={{ animationDelay: "0.2s" }}>
        <div className="rounded-[24px] p-5" style={{ background: "var(--surface)", boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[14px] font-medium">Vault</p>
              <p className="text-[12px] mt-1 leading-[1.5]" style={{ color: "var(--muted)" }}>
                {garment.vault ? "This piece is currently resting in your private archive." : "Friends can request this piece for their next look."}
              </p>
            </div>
            <button
              onClick={toggleVault}
              aria-label={garment.vault ? "Remove from vault" : "Add to vault"}
              className="w-12 h-[28px] rounded-full relative transition-all duration-300 flex-shrink-0"
              style={{ background: garment.vault ? "var(--accent)" : "var(--border-strong)" }}
            >
              <div
                className="absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white transition-all duration-300"
                style={{ left: garment.vault ? "26px" : "3px", boxShadow: "var(--shadow-sm)" }}
              />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-5 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--muted)" }}>
                  {stat.label}
                </p>
                <p className="text-[20px] font-light mt-1" style={{ fontFamily: "var(--font-serif)" }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
