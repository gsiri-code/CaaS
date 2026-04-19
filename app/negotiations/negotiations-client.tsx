"use client";

import { useEffect, useState } from "react";
import type {
  NegotiationDetailMock as NegotiationDetail,
  NegotiationDetailResponse,
  NegotiationListMock as Negotiation,
  NegotiationListResponse,
} from "@/lib/mock-fixtures";

export default function NegotiationsClient({
  userName,
  as,
}: {
  userId: string;
  userName: string;
  as: "alice" | "bob";
}) {
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [selected, setSelected] = useState<NegotiationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/negotiations?as=${as}`)
      .then((r) => r.json())
      .then((data: NegotiationListResponse) => { setNegotiations(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [as]);

  async function openNegotiation(id: string) {
    const res = await fetch(`/api/negotiations/${id}?as=${as}`);
    if (res.ok) {
      const data: NegotiationDetailResponse = await res.json();
      setSelected(data);
    }
  }

  async function handleAction(action: "accepted" | "rejected") {
    if (!selected) return;
    const res = await fetch(`/api/negotiations/${selected.id}?as=${as}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action }),
    });
    if (res.ok) {
      setSelected((s) => (s ? { ...s, status: action } : s));
      setNegotiations((ns) => ns.map((n) => (n.id === selected.id ? { ...n, status: action } : n)));
    }
  }

  // --- DETAIL VIEW ---
  if (selected) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="pt-16 px-6 flex items-center gap-3 animate-fade-up">
          <button
            onClick={() => setSelected(null)}
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
            className="text-[10px] tracking-[0.15em] uppercase font-medium px-3 py-1.5 rounded-full"
            style={{ background: "var(--surface)", color: "var(--muted)" }}
          >
            Turn {selected.turnCount}/8
          </span>
        </div>

        {/* Participant tabs */}
        <div className="px-6 pt-4 flex gap-2 animate-fade-up" style={{ animationDelay: "0.05s" }}>
          {["Alice", "Bob"].map((name) => {
            const isActive = name === userName;
            return (
              <div
                key={name}
                className="flex-1 h-10 rounded-xl flex items-center justify-center text-[13px] tracking-wide transition-all"
                style={{
                  background: isActive ? "var(--fg)" : "transparent",
                  color: isActive ? "var(--bg)" : "var(--muted)",
                  border: isActive ? "none" : "1px solid var(--border-strong)",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {name}
              </div>
            );
          })}
        </div>

        {/* Chat */}
        <div className="flex-1 px-6 pt-5 pb-4 overflow-y-auto flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          {selected.messages.map((msg, i) => {
            const isMe = msg.speaker.toLowerCase() === as;
            return (
              <div key={msg.id} className="flex flex-col gap-1.5 animate-fade-up" style={{ animationDelay: `${0.06 * i}s` }}>
                <div
                  className="max-w-[280px] rounded-2xl px-4 py-3 text-[14px] leading-[21px]"
                  style={{
                    background: isMe ? "var(--fg)" : "var(--surface)",
                    color: isMe ? "var(--bg)" : "var(--fg)",
                    alignSelf: isMe ? "flex-end" : "flex-start",
                    marginLeft: isMe ? "auto" : undefined,
                    borderBottomRightRadius: isMe ? "6px" : undefined,
                    borderBottomLeftRadius: !isMe ? "6px" : undefined,
                  }}
                >
                  {msg.content}
                </div>
                {msg.toolCall && (
                  <div
                    className="flex items-center gap-1.5 text-[10px] tracking-wide"
                    style={{ color: "var(--accent)", justifyContent: isMe ? "flex-end" : "flex-start" }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    </svg>
                    {msg.toolCall.name.replace(/_/g, " ")}
                  </div>
                )}
              </div>
            );
          })}

          {selected.messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[22px] font-light" style={{ fontFamily: "var(--font-serif)", color: "var(--muted)" }}>
                Awaiting negotiation
              </p>
              <p className="text-[12px] mt-2 tracking-wide" style={{ color: "var(--muted)" }}>
                AI agents will negotiate on your behalf.
              </p>
            </div>
          )}
        </div>

        {/* Deal Card + Actions */}
        {selected.status === "open" && (
          <div className="px-6 pb-6 pt-3 animate-fade-up" style={{ borderTop: "1px solid var(--border)", animationDelay: "0.15s" }}>
            <div
              className="flex items-center gap-4 p-4 rounded-xl mb-4 animate-fade-up"
              style={{ background: "var(--surface)", boxShadow: "var(--shadow-sm)", animationDelay: "0.2s" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.garment.heroImageUrl}
                alt={selected.garment.category}
                className="w-14 h-[70px] rounded-lg object-cover flex-shrink-0"
                style={{ background: "var(--surface-hover)" }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium truncate" style={{ fontFamily: "var(--font-serif)" }}>
                  {selected.garment.category}
                </p>
                {selected.agreedPriceUsd && (
                  <p className="text-[12px] mt-0.5" style={{ color: "var(--muted)" }}>
                    ${selected.agreedPriceUsd}/day
                  </p>
                )}
                {selected.agreedHandoff && (
                  <div className="flex items-center gap-1.5 mt-1 text-[11px]" style={{ color: "var(--accent)" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {selected.agreedHandoff.location ?? selected.agreedHandoff.datetime ?? "TBD"}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleAction("rejected")}
                className="flex-1 h-[52px] rounded-xl text-[14px] font-medium transition-all duration-200 hover:opacity-80 active:scale-[0.98] animate-fade-up"
                style={{ border: "1px solid var(--border-strong)", color: "var(--fg)", animationDelay: "0.24s" }}
              >
                Reject
              </button>
              <button
                onClick={() => handleAction("accepted")}
                className="flex-[2] h-[52px] rounded-xl text-[14px] font-medium transition-all duration-200 hover:opacity-90 active:scale-[0.98] animate-fade-up"
                style={{ background: "var(--fg)", color: "var(--bg)", animationDelay: "0.28s" }}
              >
                Accept Deal
              </button>
            </div>
          </div>
        )}

        {selected.status !== "open" && (
          <div className="px-6 pb-8 pt-5 animate-fade-up" style={{ borderTop: "1px solid var(--border)", animationDelay: "0.15s" }}>
            <div
              className="text-center py-3 rounded-xl text-[13px] font-medium tracking-wide animate-fade-up"
              style={{
                background: selected.status === "accepted" ? "var(--success-soft)" : "var(--error-soft)",
                color: selected.status === "accepted" ? "var(--success)" : "var(--error)",
                animationDelay: "0.2s",
              }}
            >
              Deal {selected.status}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- LIST VIEW ---
  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-6 pt-16 pb-4 animate-fade-up">
        <p className="text-[11px] tracking-[0.2em] uppercase mb-2" style={{ color: "var(--accent)" }}>
          Negotiations
        </p>
        <h1 className="text-[30px] font-light tracking-[-0.02em]" style={{ fontFamily: "var(--font-serif)" }}>
          Deals
        </h1>
      </div>

      <div className="px-6 flex-1">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 rounded-xl animate-shimmer" style={{ animationDelay: `${0.1 * i}s` }} />
            ))}
          </div>
        ) : negotiations.length === 0 ? (
          <div className="text-center py-16 animate-fade-up">
            <p className="text-[24px] font-light" style={{ fontFamily: "var(--font-serif)", color: "var(--muted)" }}>
              No deals yet
            </p>
            <p className="text-[13px] mt-2" style={{ color: "var(--muted)" }}>
              Find something you like first.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {negotiations.map((n, i) => (
              <button
                key={n.id}
                onClick={() => openNegotiation(n.id)}
                className="flex items-center gap-4 p-3.5 rounded-xl text-left w-full transition-all duration-200 hover:opacity-95 active:scale-[0.99] animate-fade-up"
                style={{ background: "var(--surface)", boxShadow: "var(--shadow-sm)", animationDelay: `${0.05 * i}s` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={n.garmentHeroUrl}
                  alt={n.garmentCategory}
                  className="w-14 h-[70px] rounded-lg object-cover flex-shrink-0"
                  style={{ background: "var(--surface-hover)" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium truncate" style={{ fontFamily: "var(--font-serif)" }}>
                    {n.garmentCategory}
                  </p>
                  <p className="text-[11px] mt-0.5 tracking-wide" style={{ color: "var(--muted)" }}>
                    {n.garmentBrand ?? "Unknown brand"}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="text-[10px] font-medium tracking-wide uppercase px-2.5 py-1 rounded-full"
                      style={{
                        background: n.status === "open" ? "var(--accent-soft)" : n.status === "accepted" ? "var(--success-soft)" : "var(--error-soft)",
                        color: n.status === "open" ? "var(--accent)" : n.status === "accepted" ? "var(--success)" : "var(--error)",
                      }}
                    >
                      {n.status}
                    </span>
                    <span className="text-[10px] tracking-wide" style={{ color: "var(--muted)" }}>
                      Turn {n.turnCount}/8
                    </span>
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
