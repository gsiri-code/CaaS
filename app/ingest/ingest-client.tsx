"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";

type GarmentCard = {
  id: string;
  category: string;
  heroUrl: string;
  brandGuess: string | null;
};

type Status = {
  batchId: string | null;
  photosDone: number;
  photosTotal: number;
  garmentsTotal: number;
  done: boolean;
  error: string | null;
};

const emptyStatus: Status = {
  batchId: null,
  photosDone: 0,
  photosTotal: 0,
  garmentsTotal: 0,
  done: false,
  error: null,
};

export default function IngestClient({ as }: { as: "alice" | "bob" }) {
  const [status, setStatus] = useState<Status>(emptyStatus);
  const [cards, setCards] = useState<GarmentCard[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function loadDemoPreview() {
    setStatus({
      batchId: "demo-batch",
      photosDone: 6,
      photosTotal: 6,
      garmentsTotal: 4,
      done: true,
      error: null,
    });
    setCards([
      { id: as === "alice" ? "g-alice-1" : "g-bob-1", category: "Dress", heroUrl: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80", brandGuess: "Vince" },
      { id: as === "alice" ? "g-alice-2" : "g-bob-2", category: "Outerwear", heroUrl: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=80", brandGuess: "Aritzia" },
      { id: as === "alice" ? "g-alice-1" : "g-bob-1", category: "Shoes", heroUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80", brandGuess: "Common Projects" },
      { id: as === "alice" ? "g-alice-2" : "g-bob-2", category: "Top", heroUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80", brandGuess: "Demo Atelier" },
    ]);
  }

  const onFiles = useCallback(
    async (files: FileList) => {
      if (files.length === 0) return;
      setStatus({ ...emptyStatus });
      setCards([]);

      const form = new FormData();
      form.set("as", as);
      for (const f of Array.from(files)) form.append("files", f);

      const res = await fetch("/api/ingest/upload", { method: "POST", body: form });
      if (!res.ok) {
        setStatus((s) => ({ ...s, error: `upload failed: ${res.status}` }));
        return;
      }
      const { batch_id } = (await res.json()) as { batch_id: string };
      setStatus((s) => ({ ...s, batchId: batch_id }));

      const source = new EventSource(`/api/ingest/stream?batch_id=${batch_id}`);
      source.onmessage = (ev) => {
        const event = JSON.parse(ev.data);
        if (event.type === "garment_created") {
          setCards((c) => [
            { id: event.garmentId, category: event.category, heroUrl: event.heroUrl, brandGuess: event.brandGuess },
            ...c,
          ]);
        } else if (event.type === "batch_progress") {
          setStatus((s) => ({ ...s, photosDone: event.photosDone, photosTotal: event.photosTotal, garmentsTotal: event.garmentsTotal }));
        } else if (event.type === "batch_complete") {
          setStatus((s) => ({ ...s, done: true }));
          source.close();
        } else if (event.type === "batch_error") {
          setStatus((s) => ({ ...s, done: true, error: event.error }));
          source.close();
        }
      };
      source.onerror = () => { source.close(); };
    },
    [as],
  );

  const progressPct = status.photosTotal > 0 ? Math.round((status.photosDone / status.photosTotal) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="px-6 pt-20 pb-4 animate-fade-up">
        <p className="text-[11px] tracking-[0.2em] uppercase mb-4" style={{ color: "var(--accent)" }}>
          Wardrobe Import
        </p>
        <h1
          className="text-[36px] leading-[1.1] font-light tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Import Your<br />Closet
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "var(--muted)" }}>
          Open your camera roll to get started.
        </p>
      </div>

      {/* Buttons */}
      <div className="px-6 pt-4 pb-6 flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "0.1s" }}>
        <button
          onClick={() => inputRef.current?.click()}
          className="h-[52px] rounded-xl text-[15px] font-medium flex items-center justify-center transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          style={{ background: "var(--fg)", color: "var(--bg)" }}
        >
          Open Camera Roll
        </button>
        <button
          onClick={() => inputRef.current?.click()}
          className="h-[52px] rounded-xl text-[15px] font-medium flex items-center justify-center border transition-all duration-200 hover:bg-[var(--surface)] active:scale-[0.98]"
          style={{ borderColor: "var(--border-strong)" }}
        >
          Take New Photos
        </button>
        <button
          onClick={loadDemoPreview}
          className="h-11 rounded-xl text-[13px] flex items-center justify-center transition-all duration-200 hover:opacity-80"
          style={{ background: "var(--surface)", color: "var(--muted)" }}
        >
          Load Demo Import
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".zip,image/*"
          className="hidden"
          onChange={(e) => { if (e.target.files) onFiles(e.target.files); }}
        />
      </div>

      {/* Progress */}
      {status.batchId && (
        <div className="px-6 py-4 animate-fade-up">
          <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%`, background: "var(--accent)" }}
            />
          </div>
          <div className="mt-3 flex justify-between text-[12px]" style={{ color: "var(--muted)" }}>
            <span className="tracking-wide">
              Processing {status.photosDone} / {status.photosTotal || "?"} photos
            </span>
            <span className="font-medium">{status.garmentsTotal} items</span>
          </div>
          {status.done && !status.error && (
            <p className="mt-2 text-[12px] font-medium" style={{ color: "var(--success)" }}>
              Import complete
            </p>
          )}
          {status.error && (
            <p className="mt-2 text-[12px]" style={{ color: "var(--error)" }}>Error: {status.error}</p>
          )}
        </div>
      )}

      {/* Garment Grid */}
      {cards.length > 0 && (
        <div className="px-6 pt-2 pb-4">
          <div className="grid grid-cols-2 gap-4">
            {cards.map((c, i) => (
              <Link
                key={`${c.id}-${c.category}`}
                href={`/closet/${c.id}?as=${as}`}
                className="no-underline animate-fade-up group"
                style={{ animationDelay: `${0.05 * i}s`, color: "var(--fg)" }}
              >
                <div className="overflow-hidden rounded-xl" style={{ boxShadow: "var(--shadow-sm)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.heroUrl}
                    alt={c.category}
                    className="w-full aspect-[4/5] object-cover transition-transform duration-500 group-hover:scale-105"
                    style={{ background: "var(--surface)" }}
                  />
                </div>
                <div className="pt-2.5 px-0.5">
                  <p className="text-[14px] font-medium capitalize leading-tight">{c.category}</p>
                  {c.brandGuess && (
                    <p className="text-[11px] mt-0.5 tracking-wide" style={{ color: "var(--muted)" }}>{c.brandGuess}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
