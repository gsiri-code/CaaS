"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DemoUserKey } from "@/lib/session";

type GarmentCard = {
  id: string;
  category: string;
  heroUrl: string;
  brandGuess: string | null;
};

type LogEntry = {
  id: string;
  text: string;
  type: "info" | "success" | "skip" | "error";
  ts: number;
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

export default function IngestClient({ as }: { as: DemoUserKey }) {
  const [status, setStatus] = useState<Status>(emptyStatus);
  const [cards, setCards] = useState<GarmentCard[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  const addLog = useCallback((text: string, type: LogEntry["type"] = "info") => {
    setLog((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, text, type, ts: Date.now() }]);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);


  const onFiles = useCallback(
    async (files: FileList) => {
      if (files.length === 0) return;
      setStatus({ ...emptyStatus });
      setCards([]);
      setLog([]);

      const form = new FormData();
      form.set("as", as);
      for (const f of Array.from(files)) form.append("files", f);

      addLog(`Uploading ${files.length} file${files.length === 1 ? "" : "s"}...`, "info");

      const res = await fetch("/api/ingest/upload", { method: "POST", body: form });
      if (!res.ok) {
        setStatus((s) => ({ ...s, error: `upload failed: ${res.status}` }));
        addLog(`Upload failed (${res.status})`, "error");
        return;
      }
      const { batch_id, accepted } = (await res.json()) as { batch_id: string; accepted?: number };
      setStatus((s) => ({
        ...s,
        batchId: batch_id,
        photosDone: 0,
        photosTotal: accepted ?? files.length,
        garmentsTotal: 0,
      }));
      addLog(`${accepted ?? files.length} photos accepted — scanning for clothing`, "info");

      const source = new EventSource(`/api/ingest/stream?batch_id=${batch_id}`);
      source.onmessage = (ev) => {
        const event = JSON.parse(ev.data);
        if (event.type === "photo_accepted") {
          addLog("Photo accepted for processing", "info");
        } else if (event.type === "photo_skipped") {
          addLog(`Photo skipped — ${event.reason?.replace(/_/g, " ") ?? "filtered"}`, "skip");
        } else if (event.type === "garment_created") {
          const label = [event.category, event.brandGuess].filter(Boolean).join(" — ");
          addLog(`Extracted ${label}`, "success");
          setCards((c) => [
            { id: event.garmentId, category: event.category, heroUrl: event.heroUrl, brandGuess: event.brandGuess },
            ...c,
          ]);
        } else if (event.type === "garment_merged") {
          addLog("Duplicate detected — merged with existing garment", "info");
        } else if (event.type === "batch_progress") {
          setStatus((s) => ({ ...s, photosDone: event.photosDone, photosTotal: event.photosTotal, garmentsTotal: event.garmentsTotal }));
        } else if (event.type === "batch_complete") {
          setStatus((s) => ({ ...s, done: true }));
          addLog("Import complete", "success");
          source.close();
        } else if (event.type === "batch_error") {
          setStatus((s) => ({ ...s, done: true, error: event.error }));
          addLog(`Error: ${event.error}`, "error");
          source.close();
        }
      };
      source.onerror = () => { source.close(); };
    },
    [as, addLog],
  );

  const progressPct = status.photosTotal > 0 ? Math.round((status.photosDone / status.photosTotal) * 100) : 0;
  const photoLabel = status.photosTotal > 0
    ? `${status.photosDone} / ${status.photosTotal} photo${status.photosTotal === 1 ? "" : "s"} processed`
    : "Preparing...";
  const pieceCount = cards.length;
  const itemLabel = `${pieceCount} piece${pieceCount === 1 ? "" : "s"} extracted`;
  const showItemCount = pieceCount > 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="px-6 pt-20 pb-4 animate-fade-up">
        <p className="overline mb-4">Wardrobe Import</p>
        <h1 className="section-header text-[36px]">
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
          className="btn-primary !h-[52px] w-full flex items-center justify-center"
        >
          Open Camera Roll
        </button>
        <button
          onClick={() => inputRef.current?.click()}
          className="btn-secondary !h-[52px] w-full flex items-center justify-center"
        >
          Take New Photos
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

      {/* Progress + Activity Log */}
      {status.batchId && (
        <div className="px-6 py-4 animate-fade-up">
          {/* Progress bar */}
          <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%`, background: "var(--accent)" }}
            />
          </div>
          <div className="mt-3 flex justify-between text-[12px]" style={{ color: "var(--muted)" }}>
            <span className="tracking-wide">{photoLabel}</span>
            <span className="font-medium">{showItemCount ? itemLabel : ""}</span>
          </div>

          {/* Activity log */}
          {log.length > 0 && (
            <div
              className="mt-4 rounded-xl overflow-hidden"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div
                className="px-4 py-2.5 flex items-center justify-between"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <span
                  className="text-[10px] tracking-[0.15em] uppercase font-medium"
                  style={{ color: "var(--muted)" }}
                >
                  Activity
                </span>
                {!status.done && (
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ background: "var(--accent)" }}
                    />
                    <span
                      className="text-[10px] tracking-wide"
                      style={{ color: "var(--accent)" }}
                    >
                      Processing
                    </span>
                  </span>
                )}
              </div>
              <div
                className="max-h-[180px] overflow-y-auto px-4 py-2"
                style={{ scrollbarWidth: "thin" }}
              >
                {log.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2.5 py-1.5 animate-fade-up"
                    style={{ animationDelay: `${0.03 * Math.min(i, 6)}s` }}
                  >
                    <span
                      className="mt-[5px] w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        background:
                          entry.type === "success"
                            ? "var(--success)"
                            : entry.type === "error"
                              ? "var(--error)"
                              : entry.type === "skip"
                                ? "var(--muted)"
                                : "var(--accent)",
                      }}
                    />
                    <span
                      className="text-[12px] leading-[18px]"
                      style={{
                        color:
                          entry.type === "error"
                            ? "var(--error)"
                            : entry.type === "skip"
                              ? "var(--muted)"
                              : "var(--fg)",
                      }}
                    >
                      {entry.text}
                    </span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Garment Grid */}
      {cards.length > 0 && (
        <div className="px-6 pt-2 pb-32">
          <div className="grid grid-cols-2 gap-4">
            {cards.map((c, i) => (
              <Link
                key={`${c.id}-${c.category}`}
                href={`/closet/${c.id}?as=${as}`}
                className="no-underline animate-fade-up"
                style={{ animationDelay: `${0.05 * i}s`, color: "var(--fg)" }}
              >
                <div className="card-editorial">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.heroUrl}
                    alt={c.category}
                    className="w-full aspect-[4/5] object-cover"
                    style={{ background: "var(--surface)" }}
                  />
                </div>
                <div className="pt-3 px-1">
                  <p
                    className="text-[15px] font-medium capitalize leading-tight"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {c.category}
                  </p>
                  {c.brandGuess && (
                    <p className="text-[11px] mt-1 tracking-wide" style={{ color: "var(--muted)" }}>{c.brandGuess}</p>
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
