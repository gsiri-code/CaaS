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
    setStatus("saving\u2026");
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
    <div className="space-y-5">
      {/* Category */}
      <FieldGroup label="Category">
        <select
          value={form.category}
          onChange={(e) => set("category", e.target.value)}
          className="input-editorial capitalize"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </FieldGroup>

      <div className="grid grid-cols-2 gap-4">
        <Row label="Subcategory" value={form.subcategory} onChange={(v) => set("subcategory", v)} />
        <Row label="Brand" value={form.brandGuess} onChange={(v) => set("brandGuess", v)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Row label="Primary Color" value={form.colorPrimary} onChange={(v) => set("colorPrimary", v)} />
        <Row label="Secondary Color" value={form.colorSecondary} onChange={(v) => set("colorSecondary", v)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Row label="Pattern" value={form.pattern} onChange={(v) => set("pattern", v)} />
        <Row label="Silhouette" value={form.silhouette} onChange={(v) => set("silhouette", v)} />
      </div>

      {/* Description */}
      <FieldGroup label="Description" hint="editing re-embeds for search">
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          className="input-editorial resize-none"
        />
      </FieldGroup>

      {/* Value */}
      <FieldGroup label="Estimated Value (USD)">
        <input
          type="number"
          value={form.estimatedValueUsd ?? ""}
          onChange={(e) =>
            set("estimatedValueUsd", e.target.value === "" ? null : Number(e.target.value))
          }
          className="input-editorial"
        />
      </FieldGroup>

      {/* Vault toggle */}
      <div
        className="flex items-center justify-between p-4 rounded-2xl"
        style={{ background: "var(--surface)" }}
      >
        <div>
          <p className="text-[14px] font-medium">Vault</p>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--muted)" }}>
            Hidden from friend search &amp; agents
          </p>
        </div>
        <button
          type="button"
          onClick={() => set("vault", !form.vault)}
          aria-label={form.vault ? "Remove from vault" : "Add to vault"}
          className="w-12 h-[28px] rounded-full relative transition-all duration-300 flex-shrink-0"
          style={{ background: form.vault ? "var(--accent)" : "var(--border-strong)" }}
        >
          <div
            className="absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white transition-all duration-300"
            style={{ left: form.vault ? "26px" : "3px", boxShadow: "var(--shadow-sm)" }}
          />
        </button>
      </div>

      {/* Actions */}
      <div className="pt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? "Saving\u2026" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={destroy}
          className="btn-secondary"
          style={{ borderColor: "rgba(181, 56, 59, 0.3)", color: "var(--error)" }}
        >
          Delete
        </button>
        {status && (
          <span className="text-[12px] tracking-wide" style={{ color: "var(--muted)" }}>
            {status}
          </span>
        )}
        {error && (
          <span className="text-[12px]" style={{ color: "var(--error)" }}>
            {error}
          </span>
        )}
      </div>
    </div>
  );
}

function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label-mono mb-2 block" style={{ color: "var(--muted)" }}>
        {label}
        {hint && (
          <span style={{ opacity: 0.5, marginLeft: 6, textTransform: "none", letterSpacing: "normal" }}>
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
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
    <FieldGroup label={label}>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        className="input-editorial"
      />
    </FieldGroup>
  );
}
