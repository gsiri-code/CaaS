"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Message = {
  id?: string;
  speaker: string;
  content: string;
  toolCall: unknown;
  createdAt?: string | Date;
};

type Deal = {
  priceUsd: number;
  durationDays?: number;
  handoff: { type: string; datetime?: string; location?: string } | null;
};

type Props = {
  id: string;
  initialStatus: string;
  initialMessages: Message[];
  initialDeal: { priceUsd: number; handoff: Deal["handoff"] } | null;
  requesterName: string;
  ownerName: string;
  asKey: "alice" | "bob";
};

export default function NegotiationClient({
  id,
  initialStatus,
  initialMessages,
  initialDeal,
  requesterName,
  ownerName,
  asKey,
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [status, setStatus] = useState(initialStatus);
  const [deal, setDeal] = useState<Deal | null>(
    initialDeal ? { priceUsd: initialDeal.priceUsd, handoff: initialDeal.handoff } : null,
  );
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (status !== "open") return;

    const source = new EventSource(`/api/negotiations/${id}/stream`);
    sourceRef.current = source;

    source.onmessage = (ev) => {
      try {
        const event = JSON.parse(ev.data);
        if (event.type === "message") {
          setMessages((prev) => [
            ...prev,
            {
              speaker: event.speaker,
              content: event.content,
              toolCall: event.toolCall,
            },
          ]);
        } else if (event.type === "deal_proposed") {
          setDeal({
            priceUsd: event.priceUsd,
            durationDays: event.durationDays,
            handoff: event.handoff,
          });
        } else if (event.type === "negotiation_accepted") {
          setStatus("accepted");
        } else if (event.type === "negotiation_rejected") {
          setStatus("rejected");
        } else if (event.type === "negotiation_expired") {
          setStatus("expired");
        } else if (event.type === "negotiation_error") {
          setStatus("error");
          setError(event.error);
        }
      } catch (e) {
        console.error("bad event", e);
      }
    };
    source.onerror = () => source.close();
    return () => source.close();
  }, [id, status]);

  const humanReject = async () => {
    const res = await fetch(`/api/negotiations/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ as: asKey }),
    });
    if (res.ok) {
      setStatus("rejected");
      router.refresh();
    }
  };

  const requesterMessages = messages.filter((m) => m.speaker === "requester_agent");
  const ownerMessages = messages.filter((m) => m.speaker === "owner_agent");

  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AgentPane
          title={`${requesterName}'s agent`}
          subtitle="requester"
          accent="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900"
          messages={requesterMessages}
        />
        <AgentPane
          title={`${ownerName}'s agent`}
          subtitle="owner"
          accent="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900"
          messages={ownerMessages}
        />
      </div>

      <div className="mt-6 rounded border border-black/10 dark:border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-black/50 dark:text-white/50">
              status
            </div>
            <div className="text-lg font-semibold capitalize">
              {status}{" "}
              {status === "accepted" && <span className="ml-1">🎉</span>}
              {status === "rejected" && <span className="ml-1">—</span>}
              {status === "expired" && <span className="ml-1">⌛</span>}
            </div>
            {error && <div className="text-xs text-red-600 mt-1">error: {error}</div>}
          </div>

          {deal && (
            <div className="text-right text-sm">
              <div className="text-xs uppercase tracking-wider text-black/50 dark:text-white/50">
                current deal
              </div>
              <div className="font-semibold">
                ${deal.priceUsd}
                {deal.durationDays ? ` · ${deal.durationDays}d` : ""}
              </div>
              {deal.handoff && (
                <div className="text-xs text-black/60 dark:text-white/60">
                  handoff: {deal.handoff.type}
                  {deal.handoff.location ? ` @ ${deal.handoff.location}` : ""}
                  {deal.handoff.datetime ? ` (${deal.handoff.datetime})` : ""}
                </div>
              )}
            </div>
          )}
        </div>

        {status === "open" && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled
              className="px-3 py-1 rounded bg-emerald-600 text-white disabled:opacity-50"
              title="Agents will accept autonomously"
            >
              accept (agent-driven)
            </button>
            <button
              type="button"
              onClick={humanReject}
              className="px-3 py-1 rounded border border-red-500/40 text-red-600"
            >
              reject & kill
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentPane({
  title,
  subtitle,
  accent,
  messages,
}: {
  title: string;
  subtitle: string;
  accent: string;
  messages: Message[];
}) {
  return (
    <div className={`rounded border ${accent} p-3 flex flex-col`}>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-medium text-sm">{title}</h3>
        <span className="text-xs text-black/50 dark:text-white/50">{subtitle}</span>
      </div>
      <div className="space-y-3 text-sm">
        {messages.length === 0 && (
          <p className="text-xs text-black/40 dark:text-white/40 italic">waiting…</p>
        )}
        {messages.map((m, i) => {
          const action = m.toolCall as { name?: string; input?: Record<string, unknown> } | null;
          return (
            <div key={m.id ?? i} className="rounded bg-white/60 dark:bg-black/40 p-2">
              {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
              {action && (
                <div className="mt-1.5 text-xs font-mono text-black/70 dark:text-white/60">
                  → {action.name}
                  {action.input && Object.keys(action.input).length > 0 && (
                    <span className="ml-1">
                      {JSON.stringify(action.input)}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
