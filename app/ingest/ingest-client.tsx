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
      {
        id: as === "alice" ? "g-alice-1" : "g-bob-1",
        category: "Dress",
        heroUrl:
          "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
        brandGuess: "Vince",
      },
      {
        id: as === "alice" ? "g-alice-2" : "g-bob-2",
        category: "Outerwear",
        heroUrl:
          "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=80",
        brandGuess: "Aritzia",
      },
      {
        id: as === "alice" ? "g-alice-1" : "g-bob-1",
        category: "Shoes",
        heroUrl:
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
        brandGuess: "Common Projects",
      },
      {
        id: as === "alice" ? "g-alice-2" : "g-bob-2",
        category: "Top",
        heroUrl:
          "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80",
        brandGuess: "Demo Atelier",
      },
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
            {
              id: event.garmentId,
              category: event.category,
              heroUrl: event.heroUrl,
              brandGuess: event.brandGuess,
            },
            ...c,
          ]);
        } else if (event.type === "batch_progress") {
          setStatus((s) => ({
            ...s,
            photosDone: event.photosDone,
            photosTotal: event.photosTotal,
            garmentsTotal: event.garmentsTotal,
          }));
        } else if (event.type === "batch_complete") {
          setStatus((s) => ({ ...s, done: true }));
          source.close();
        } else if (event.type === "batch_error") {
          setStatus((s) => ({ ...s, done: true, error: event.error }));
          source.close();
        }
      };
      source.onerror = () => {
        source.close();
      };
    },
    [as],
  );

  const progressPct =
    status.photosTotal > 0
      ? Math.round((status.photosDone / status.photosTotal) * 100)
      : 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="px-6 pt-16 pb-2">
        <h1 className="text-[28px] font-light tracking-tight leading-[34px]">
          Import Your{"\n"}Closet
        </h1>
        <p className="mt-3 text-[15px] text-[#757575]">
          Open your camera roll to get started.
        </p>
      </div>

      {/* Buttons */}
      <div className="px-6 py-6 flex flex-col gap-3">
        <button
          onClick={() => inputRef.current?.click()}
          className="h-12 rounded bg-black text-white text-[15px] font-medium flex items-center justify-center"
        >
          Open Camera Roll
        </button>
        <button
          onClick={() => inputRef.current?.click()}
          className="h-12 rounded border border-black/8 text-[15px] font-medium flex items-center justify-center"
        >
          Take New Photos
        </button>
        <button
          onClick={loadDemoPreview}
          className="h-11 rounded text-[14px] text-[#757575] bg-[#F7F7F7] flex items-center justify-center"
        >
          Load Demo Import
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".zip,image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) onFiles(e.target.files);
          }}
        />
      </div>

      {/* Progress */}
      {status.batchId && (
        <div className="px-6 py-3">
          <div className="h-0.5 bg-black/8 rounded-full overflow-hidden">
            <div
              className="h-full bg-black rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[13px] text-[#757575]">
            <span>
              Processing {status.photosDone} / {status.photosTotal || "?"} photos
            </span>
            <span>{status.garmentsTotal} items</span>
          </div>
          {status.done && !status.error && (
            <p className="mt-1 text-[13px] text-emerald-600 font-medium">Complete</p>
          )}
          {status.error && (
            <p className="mt-1 text-[13px] text-red-600">Error: {status.error}</p>
          )}
        </div>
      )}

      {/* Garment Grid */}
      {cards.length > 0 && (
        <div className="px-6 pt-2 pb-4">
          <div className="grid grid-cols-2 gap-4">
            {cards.map((c) => (
              <Link
                key={c.id}
                href={`/closet/${c.id}?as=${as}`}
                className="no-underline text-black"
              >
                <div className="rounded overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.heroUrl}
                    alt={c.category}
                    className="w-full aspect-[163/200] object-cover bg-[#F0F0F0]"
                  />
                  <div className="pt-2">
                    <p className="text-[14px] font-medium capitalize leading-tight">
                      {c.category}
                    </p>
                    {c.brandGuess && (
                      <p className="text-[12px] text-[#757575] mt-0.5">
                        {c.brandGuess}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
