"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
  estimatedValueUsd: number | null;
  vault: boolean;
};

const CATEGORIES = ["top", "bottom", "dress", "outerwear", "shoe", "accessory"] as const;

export default function GarmentEditor({ garment, asKey }: { garment: Garment; asKey: string }) {
  const router = useRouter();
  const [form, setForm] = useState(garment);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const set = <K extends keyof Garment>(k: K, v: Garment[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const diff = (): Partial<Garment> => {
    const out: Record<string, unknown> = {};
    (Object.keys(garment) as (keyof Garment)[]).forEach((k) => {
      if (k === "id") return;
      if (form[k] !== garment[k]) out[k] = form[k];
    });
    return out as Partial<Garment>;
  };

  const save = () => {
    const patch = diff();
    if (Object.keys(patch).length === 0) {
      setStatus("nothing changed");
      return;
    }
    setError(null);
    setStatus("saving…");
    startSaving(async () => {
      const res = await fetch(`/api/closet/${garment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus(null);
        setError(typeof data.error === "string" ? data.error : `HTTP ${res.status}`);
        return;
      }
      setStatus("saved");
      router.refresh();
    });
  };

  const destroy = async () => {
    if (!confirm("Delete this garment? This cannot be undone.")) return;
    const res = await fetch(`/api/closet/${garment.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(`delete failed: HTTP ${res.status}`);
      return;
    }
    router.push(asKey ? `/closet?as=${asKey}` : "/closet");
    router.refresh();
  };

  return (
    <div className="space-y-3 text-sm">
      <label className="block">
        <span className="text-xs text-black/60 dark:text-white/60">category</span>
        <select
          value={form.category}
          onChange={(e) => set("category", e.target.value)}
          className="mt-1 block w-full rounded border border-black/15 dark:border-white/15 bg-transparent px-2 py-1"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <Row label="subcategory" value={form.subcategory} onChange={(v) => set("subcategory", v)} />
      <Row label="primary color" value={form.colorPrimary} onChange={(v) => set("colorPrimary", v)} />
      <Row label="secondary color" value={form.colorSecondary} onChange={(v) => set("colorSecondary", v)} />
      <Row label="pattern" value={form.pattern} onChange={(v) => set("pattern", v)} />
      <Row label="silhouette" value={form.silhouette} onChange={(v) => set("silhouette", v)} />
      <Row label="brand" value={form.brandGuess} onChange={(v) => set("brandGuess", v)} />

      <label className="block">
        <span className="text-xs text-black/60 dark:text-white/60">
          description <span className="text-black/40">(editing re-embeds for search)</span>
        </span>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded border border-black/15 dark:border-white/15 bg-transparent px-2 py-1"
        />
      </label>

      <label className="block">
        <span className="text-xs text-black/60 dark:text-white/60">estimated value (USD)</span>
        <input
          type="number"
          value={form.estimatedValueUsd ?? ""}
          onChange={(e) =>
            set("estimatedValueUsd", e.target.value === "" ? null : Number(e.target.value))
          }
          className="mt-1 block w-full rounded border border-black/15 dark:border-white/15 bg-transparent px-2 py-1"
        />
      </label>

      <label className="flex items-center gap-2 pt-2">
        <input
          type="checkbox"
          checked={form.vault}
          onChange={(e) => set("vault", e.target.checked)}
        />
        <span>
          <span className="font-medium">vault</span>{" "}
          <span className="text-xs text-black/60 dark:text-white/60">
            — flag as untransactable (hidden from friend search / agents)
          </span>
        </span>
      </label>

      <div className="pt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-4 py-1.5 rounded bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
        >
          {saving ? "saving…" : "save"}
        </button>
        <button
          type="button"
          onClick={destroy}
          className="px-3 py-1.5 rounded border border-red-500/40 text-red-600"
        >
          delete
        </button>
        {status && <span className="text-xs text-black/60 dark:text-white/60">{status}</span>}
        {error && <span className="text-xs text-red-600">error: {error}</span>}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-black/60 dark:text-white/60">{label}</span>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        className="mt-1 block w-full rounded border border-black/15 dark:border-white/15 bg-transparent px-2 py-1"
      />
    </label>
  );
}
