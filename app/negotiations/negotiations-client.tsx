"use client";

import { useEffect, useState } from "react";

type Negotiation = {
  id: string;
  requesterId: string;
  ownerId: string;
  garmentId: string;
  status: string;
  agreedPriceUsd: number | null;
  agreedHandoff: { type: string; datetime?: string; location?: string } | null;
  turnCount: number;
  garmentCategory: string;
  garmentHeroUrl: string;
  garmentBrand: string | null;
  garmentDescription: string;
};

type Message = {
  id: string;
  speaker: string;
  content: string;
  toolCall: { name: string; result?: string } | null;
  createdAt: string;
};

type NegotiationDetail = Negotiation & {
  messages: Message[];
  garment: {
    id: string;
    category: string;
    brandGuess: string | null;
    description: string;
    heroImageUrl: string;
    estimatedValueUsd: number | null;
  };
};

export default function NegotiationsClient({
  userId,
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
      .then((data) => {
        setNegotiations(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [as]);

  async function openNegotiation(id: string) {
    const res = await fetch(`/api/negotiations/${id}`);
    if (res.ok) {
      setSelected(await res.json());
    }
  }

  async function handleAction(action: "accepted" | "rejected") {
    if (!selected) return;
    const res = await fetch(`/api/negotiations/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action }),
    });
    if (res.ok) {
      setSelected((s) => (s ? { ...s, status: action } : s));
      setNegotiations((ns) =>
        ns.map((n) => (n.id === selected.id ? { ...n, status: action } : n)),
      );
    }
  }

  if (selected) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Tabs header */}
        <div className="pt-14 px-6 flex items-center gap-3">
          <button
            onClick={() => setSelected(null)}
            className="text-[15px] text-[#757575]"
          >
            ← Back
          </button>
          <div className="flex-1" />
          <span className="text-[12px] text-[#757575] bg-[#F5F5F5] px-2.5 py-1 rounded-full">
            Turn {selected.turnCount}/8
          </span>
        </div>

        {/* Participant tabs */}
        <div className="px-6 pt-3 flex gap-2">
          {["Alice", "Bob"].map((name) => {
            const isRequester = name === userName;
            return (
              <div
                key={name}
                className={`flex-1 h-9 rounded flex items-center justify-center text-[14px] font-medium ${
                  isRequester
                    ? "bg-black text-white"
                    : "border border-black/10 text-black/60"
                }`}
              >
                {name}
              </div>
            );
          })}
        </div>

        {/* Chat */}
        <div className="flex-1 px-6 pt-4 pb-4 overflow-y-auto flex flex-col gap-3">
          {selected.messages.map((msg) => {
            const isMe = msg.speaker.toLowerCase() === as;
            return (
              <div key={msg.id} className="flex flex-col gap-1">
                <div
                  className={`max-w-[280px] rounded-xl px-4 py-3 text-[14px] leading-[20px] ${
                    isMe
                      ? "bg-black text-white self-end ml-auto"
                      : "bg-[#F5F5F5] text-black self-start"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.toolCall && (
                  <div className={`flex items-center gap-1.5 text-[11px] text-[#999] ${isMe ? "justify-end" : ""}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    </svg>
                    {msg.toolCall.name}
                  </div>
                )}
              </div>
            );
          })}

          {selected.messages.length === 0 && (
            <p className="text-center text-[14px] text-[#999] py-8">
              No messages yet. The AI agents will negotiate on your behalf.
            </p>
          )}
        </div>

        {/* Deal Card + Actions */}
        {selected.status === "open" && (
          <div className="px-6 pb-6 pt-2 border-t border-black/6">
            {/* Deal summary card */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-[10px] bg-[#FAFAFA] mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.garment.heroImageUrl}
                alt={selected.garment.category}
                className="w-14 h-[70px] rounded object-cover bg-[#E8E8E8] flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium truncate">
                  {selected.garment.category}
                </p>
                {selected.agreedPriceUsd && (
                  <p className="text-[13px] text-[#757575] mt-0.5">
                    ${selected.agreedPriceUsd}/day
                  </p>
                )}
                {selected.agreedHandoff && (
                  <div className="flex items-center gap-1.5 mt-1 text-[12px] text-[#757575]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {selected.agreedHandoff.datetime ?? "TBD"}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleAction("rejected")}
                className="flex-1 h-12 rounded border border-black/10 text-[15px] font-medium"
              >
                Reject
              </button>
              <button
                onClick={() => handleAction("accepted")}
                className="flex-[2] h-12 rounded bg-black text-white text-[15px] font-medium"
              >
                Accept Deal
              </button>
            </div>
          </div>
        )}

        {selected.status !== "open" && (
          <div className="px-6 pb-6 pt-4 border-t border-black/6">
            <p className={`text-center text-[14px] font-medium ${
              selected.status === "accepted" ? "text-emerald-600" : "text-red-500"
            }`}>
              Deal {selected.status}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-6 pt-14 pb-4">
        <h1 className="text-[22px] font-semibold">Deals</h1>
      </div>

      <div className="px-6 flex-1">
        {loading ? (
          <p className="text-[14px] text-[#999] py-8 text-center">Loading...</p>
        ) : negotiations.length === 0 ? (
          <p className="text-[14px] text-[#999] py-8 text-center">
            No negotiations yet. Find something you like first!
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {negotiations.map((n) => (
              <button
                key={n.id}
                onClick={() => openNegotiation(n.id)}
                className="flex items-center gap-3.5 p-3 rounded-[10px] bg-[#FAFAFA] text-left w-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={n.garmentHeroUrl}
                  alt={n.garmentCategory}
                  className="w-14 h-[70px] rounded object-cover bg-[#E8E8E8] flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium truncate">
                    {n.garmentCategory}
                  </p>
                  <p className="text-[12px] text-[#757575] mt-0.5">
                    {n.garmentBrand ?? "Unknown brand"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      n.status === "open"
                        ? "bg-amber-100 text-amber-700"
                        : n.status === "accepted"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-600"
                    }`}>
                      {n.status}
                    </span>
                    <span className="text-[11px] text-[#999]">
                      Turn {n.turnCount}/8
                    </span>
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2">
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
