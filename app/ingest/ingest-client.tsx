"use client";

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

  return (
    <div className="mt-6">
      <div
        className="border-2 border-dashed border-black/20 dark:border-white/20 rounded-lg p-8 text-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files) onFiles(e.dataTransfer.files);
        }}
      >
        <p className="text-sm">
          Drop a <code className="font-mono">.zip</code> or multi-select images
        </p>
        <p className="text-xs text-black/50 dark:text-white/50 mt-1">
          jpg / jpeg / png / webp / heic
        </p>
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

      {status.batchId && (
        <div className="mt-4 text-sm flex items-center gap-4">
          <span>
            Processed {status.photosDone}/{status.photosTotal || "?"} photos
          </span>
          <span>
            {status.garmentsTotal} unique garment{status.garmentsTotal === 1 ? "" : "s"}
          </span>
          {status.done && !status.error && <span className="text-emerald-600">done</span>}
          {status.error && <span className="text-red-600">error: {status.error}</span>}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div
            key={c.id}
            className="rounded border border-black/10 dark:border-white/10 overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.heroUrl} alt={c.category} className="w-full aspect-square object-cover" />
            <div className="px-2 py-1 text-xs flex items-center justify-between">
              <span className="capitalize">{c.category}</span>
              {c.brandGuess && (
                <span className="text-black/50 dark:text-white/50 truncate ml-2">
                  {c.brandGuess}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
