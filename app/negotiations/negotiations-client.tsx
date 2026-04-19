"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getDemoUser,
  getOtherDemoUser,
  type DemoUserKey,
} from "@/lib/demo-users";
import type {
  NegotiationDetailMock as NegotiationDetail,
  NegotiationDetailResponse,
  NegotiationListMock as Negotiation,
  NegotiationListResponse,
  NegotiationMessageMock,
} from "@/lib/mock-fixtures";

type StreamMessage = {
  id: string;
  speaker: string;
  content: string;
  toolCall: { name: string; result?: string } | null;
  createdAt: string;
};

export default function NegotiationsClient({
  as,
}: {
  userId: string;
  userName: string;
  as: DemoUserKey;
}) {
  const currentUser = useMemo(() => getDemoUser(as), [as]);
  const otherUser = useMemo(() => getOtherDemoUser(as), [as]);
  const participantNames = [currentUser.name, otherUser.name];
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [selected, setSelected] = useState<NegotiationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/negotiations?as=${as}`)
      .then((r) => r.json())
      .then((data: NegotiationListResponse) => {
        setNegotiations(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [as]);

  // Auto-scroll when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages]);

  async function openNegotiation(id: string) {
    const res = await fetch(`/api/negotiations/${id}?as=${as}`);
    if (res.ok) {
      const data: NegotiationDetailResponse = await res.json();
      setSelected(data);
      // If still open, connect to stream
      if (data.status === "open") {
        connectStream(id);
      }
    }
  }

  const connectStream = useCallback(
    (negotiationId: string) => {
      setStreaming(true);
      const es = new EventSource(
        `/api/negotiations/${negotiationId}/stream`,
      );

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "message") {
            const msg: StreamMessage = data.message;
            setSelected((prev) => {
              if (!prev) return prev;
              const exists = prev.messages.some((m) => m.id === msg.id);
              if (exists) return prev;
              return {
                ...prev,
                messages: [
                  ...prev.messages,
                  {
                    id: msg.id,
                    speaker: msg.speaker,
                    content: msg.content,
                    toolCall: msg.toolCall,
                    createdAt: new Date(msg.createdAt),
                  } as NegotiationMessageMock,
                ],
              };
            });
          }

          if (data.type === "turn") {
            setSelected((prev) =>
              prev ? { ...prev, turnCount: data.turnCount } : prev,
            );
          }

          if (data.type === "status_change") {
            setSelected((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                status: data.status,
                agreedPriceUsd: data.agreedPriceUsd ?? prev.agreedPriceUsd,
                agreedHandoff: data.agreedHandoff ?? prev.agreedHandoff,
              };
            });
            setNegotiations((ns) =>
              ns.map((n) =>
                n.id === negotiationId
                  ? { ...n, status: data.status }
                  : n,
              ),
            );
          }

          if (data.type === "done" || data.type === "error") {
            setStreaming(false);
            es.close();
          }
        } catch {
          /* ignore parse errors */
        }
      };

      es.onerror = () => {
        setStreaming(false);
        es.close();
      };

      return () => {
        es.close();
        setStreaming(false);
      };
    },
    [],
  );

  async function handleAction(action: "accepted" | "rejected") {
    if (!selected) return;
    const res = await fetch(`/api/negotiations/${selected.id}?as=${as}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action }),
    });
    if (res.ok) {
      setSelected((s) => (s ? { ...s, status: action } : s));
      setNegotiations((ns) =>
        ns.map((n) =>
          n.id === selected.id ? { ...n, status: action } : n,
        ),
      );
    }
  }

  // --- DETAIL VIEW ---
  if (selected) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="pt-16 px-6 flex items-center gap-3 animate-fade-up">
          <button
            onClick={() => {
              setSelected(null);
              setStreaming(false);
            }}
            className="flex items-center gap-1.5 text-[13px] tracking-wide transition-opacity hover:opacity-70"
            style={{ color: "var(--muted)" }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            {streaming && (
              <span
                className="text-[10px] tracking-[0.12em] uppercase font-medium px-2.5 py-1.5 rounded-full flex items-center gap-1.5"
                style={{
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: "var(--accent)" }}
                />
                Live
              </span>
            )}
            <span
              className="text-[10px] tracking-[0.15em] uppercase font-medium px-3 py-1.5 rounded-full"
              style={{
                background: "var(--surface)",
                color: "var(--muted)",
              }}
            >
              Turn {selected.turnCount}/8
            </span>
          </div>
        </div>

        {/* Participant tabs */}
        <div
          className="px-6 pt-4 flex gap-2 animate-fade-up"
          style={{ animationDelay: "0.05s" }}
        >
          {participantNames.map((name, index) => {
            const isActive = index === 0;
            return (
              <div
                key={name}
                className="flex-1 h-10 rounded-xl flex items-center justify-center text-[13px] tracking-wide transition-all"
                style={{
                  background: isActive ? "var(--fg)" : "transparent",
                  color: isActive ? "var(--bg)" : "var(--muted)",
                  border: isActive
                    ? "none"
                    : "1px solid var(--border-strong)",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {name}
              </div>
            );
          })}
        </div>

        {/* Chat */}
        <div
          className="flex-1 px-6 pt-5 pb-4 overflow-y-auto flex flex-col gap-3 animate-fade-up"
          style={{ animationDelay: "0.1s" }}
        >
          {selected.messages.map((msg, i) => {
            const normalizedSpeaker = msg.speaker.toLowerCase();
            const isMe =
              normalizedSpeaker === as ||
              normalizedSpeaker === currentUser.name.toLowerCase();
            return (
              <div
                key={msg.id}
                className="flex flex-col gap-1.5 animate-fade-up"
                style={{ animationDelay: `${0.06 * i}s` }}
              >
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
                    style={{
                      color: "var(--accent)",
                      justifyContent: isMe ? "flex-end" : "flex-start",
                    }}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    </svg>
                    {msg.toolCall.name.replace(/_/g, " ")}
                  </div>
                )}
              </div>
            );
          })}

          {streaming && selected.messages.length > 0 && (
            <div className="flex items-center gap-2 py-2 animate-fade-up">
              <div className="flex gap-1">
                <span
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{
                    background: "var(--muted)",
                    animationDelay: "0s",
                  }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{
                    background: "var(--muted)",
                    animationDelay: "0.15s",
                  }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{
                    background: "var(--muted)",
                    animationDelay: "0.3s",
                  }}
                />
              </div>
              <span
                className="text-[11px] tracking-wide"
                style={{ color: "var(--muted)" }}
              >
                Agents negotiating...
              </span>
            </div>
          )}

          {!streaming && selected.messages.length === 0 && (
            <div className="text-center py-12">
              <p
                className="text-[22px] font-light"
                style={{
                  fontFamily: "var(--font-serif)",
                  color: "var(--muted)",
                }}
              >
                Awaiting negotiation
              </p>
              <p
                className="text-[12px] mt-2 tracking-wide"
                style={{ color: "var(--muted)" }}
              >
                AI agents will negotiate on your behalf.
              </p>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Pending Approval — owner must confirm the deal */}
        {selected.status === "pending_approval" && (
          <div
            className="px-6 pb-6 pt-3 animate-fade-up"
            style={{
              borderTop: "1px solid var(--border)",
              animationDelay: "0.15s",
            }}
          >
            <p
              className="text-[11px] tracking-[0.12em] uppercase font-medium text-center mb-3"
              style={{ color: "var(--accent)" }}
            >
              Agents reached a deal — awaiting your approval
            </p>
            <div
              className="flex items-center gap-4 p-4 rounded-xl mb-4 animate-fade-up"
              style={{
                background: "var(--surface)",
                boxShadow: "var(--shadow-sm)",
                animationDelay: "0.2s",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.garment.heroImageUrl}
                alt={selected.garment.category}
                className="w-14 h-[70px] rounded-lg object-cover flex-shrink-0"
                style={{ background: "var(--surface-hover)" }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-[14px] font-medium truncate"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {selected.garment.category}
                </p>
                {selected.agreedPriceUsd && (
                  <p
                    className="text-[12px] mt-0.5"
                    style={{ color: "var(--muted)" }}
                  >
                    ${selected.agreedPriceUsd}/day
                  </p>
                )}
                {selected.agreedHandoff && (
                  <div
                    className="flex items-center gap-1.5 mt-1 text-[11px]"
                    style={{ color: "var(--accent)" }}
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {selected.agreedHandoff.location ??
                      selected.agreedHandoff.datetime ??
                      "TBD"}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleAction("rejected")}
                className="btn-secondary flex-1 !h-[52px] animate-fade-up"
                style={{ animationDelay: "0.24s" }}
              >
                Reject
              </button>
              <button
                onClick={() => handleAction("accepted")}
                className="btn-primary flex-[2] !h-[52px] animate-fade-up"
                style={{ animationDelay: "0.28s" }}
              >
                Accept Deal
              </button>
            </div>
          </div>
        )}

        {selected.status !== "open" && selected.status !== "pending_approval" && (
          <div
            className="px-6 pb-8 pt-5 animate-fade-up"
            style={{
              borderTop: "1px solid var(--border)",
              animationDelay: "0.15s",
            }}
          >
            {/* Show final deal card if accepted */}
            {selected.status === "accepted" && selected.agreedPriceUsd && (
              <div
                className="flex items-center gap-4 p-4 rounded-xl mb-4 animate-fade-up"
                style={{
                  background: "var(--surface)",
                  boxShadow: "var(--shadow-sm)",
                  animationDelay: "0.18s",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.garment.heroImageUrl}
                  alt={selected.garment.category}
                  className="w-14 h-[70px] rounded-lg object-cover flex-shrink-0"
                  style={{ background: "var(--surface-hover)" }}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[14px] font-medium truncate"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {selected.garment.category}
                  </p>
                  <p
                    className="text-[12px] mt-0.5"
                    style={{ color: "var(--muted)" }}
                  >
                    ${selected.agreedPriceUsd}/day
                  </p>
                  {selected.agreedHandoff?.location && (
                    <div
                      className="flex items-center gap-1.5 mt-1 text-[11px]"
                      style={{ color: "var(--accent)" }}
                    >
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect
                          x="3"
                          y="4"
                          width="18"
                          height="18"
                          rx="2"
                        />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {selected.agreedHandoff.location}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div
              className="text-center py-3 rounded-xl text-[13px] font-medium tracking-wide animate-fade-up"
              style={{
                background:
                  selected.status === "accepted"
                    ? "var(--success-soft)"
                    : "var(--error-soft)",
                color:
                  selected.status === "accepted"
                    ? "var(--success)"
                    : "var(--error)",
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
    <div className="min-h-screen flex flex-col pb-32">
      <div className="px-6 pt-20 pb-4 animate-fade-up">
        <p className="overline mb-4">Negotiations</p>
        <h1 className="section-header text-[36px]">Deals</h1>
      </div>

      <div className="px-6 flex-1">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl animate-shimmer"
                style={{ animationDelay: `${0.1 * i}s` }}
              />
            ))}
          </div>
        ) : negotiations.length === 0 ? (
          <div className="text-center py-20 animate-fade-up">
            <p
              className="section-header text-[26px]"
              style={{ color: "var(--muted)" }}
            >
              No deals yet
            </p>
            <p
              className="text-[13px] mt-3"
              style={{ color: "var(--muted)" }}
            >
              Find something you like first.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {negotiations.map((n, i) => (
              <button
                key={n.id}
                onClick={() => openNegotiation(n.id)}
                className="flex items-center gap-4 p-4 rounded-2xl text-left w-full transition-all duration-300 hover:shadow-md active:scale-[0.99] animate-fade-up"
                style={{
                  background: "var(--surface)",
                  boxShadow: "var(--shadow-editorial)",
                  animationDelay: `${0.05 * i}s`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={n.garmentHeroUrl}
                  alt={n.garmentCategory}
                  className="w-14 h-[70px] rounded-lg object-cover flex-shrink-0"
                  style={{ background: "var(--surface-hover)" }}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[14px] font-medium truncate"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {n.garmentCategory}
                  </p>
                  <p
                    className="text-[11px] mt-0.5 tracking-wide"
                    style={{ color: "var(--muted)" }}
                  >
                    {n.garmentBrand ?? "Unknown brand"}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="text-[10px] font-medium tracking-wide uppercase px-2.5 py-1 rounded-full"
                      style={{
                        background:
                          n.status === "open"
                            ? "var(--accent-soft)"
                            : n.status === "pending_approval"
                              ? "var(--accent-soft)"
                              : n.status === "accepted"
                                ? "var(--success-soft)"
                                : "var(--error-soft)",
                        color:
                          n.status === "open"
                            ? "var(--accent)"
                            : n.status === "pending_approval"
                              ? "var(--accent)"
                              : n.status === "accepted"
                                ? "var(--success)"
                                : "var(--error)",
                      }}
                    >
                      {n.status === "pending_approval" ? "needs approval" : n.status}
                    </span>
                    <span
                      className="text-[10px] tracking-wide"
                      style={{ color: "var(--muted)" }}
                    >
                      Turn {n.turnCount}/8
                    </span>
                  </div>
                </div>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--muted)"
                  strokeWidth="2"
                >
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
