import { EventEmitter } from "node:events";

export type NegotiationEvent =
  | { type: "message"; speaker: "requester_agent" | "owner_agent"; content: string; toolCall: unknown | null; turn: number }
  | { type: "tool_error"; speaker: "requester_agent" | "owner_agent"; error: string }
  | {
      type: "deal_proposed";
      negotiationId: string;
      garmentId: string;
      priceUsd: number;
      durationDays: number;
      handoff: { type: string; datetime?: string; location?: string };
    }
  | { type: "negotiation_accepted"; negotiationId: string }
  | { type: "negotiation_rejected"; negotiationId: string; reasoning: string }
  | { type: "negotiation_expired"; negotiationId: string }
  | { type: "negotiation_error"; negotiationId: string; error: string };

type Bus = {
  emitter: EventEmitter;
  backlog: NegotiationEvent[];
  done: boolean;
};

const globalForBus = globalThis as unknown as { _caasNegBuses?: Map<string, Bus> };
const buses = globalForBus._caasNegBuses ?? new Map<string, Bus>();
globalForBus._caasNegBuses = buses;

export function createNegBus(id: string): Bus {
  const bus: Bus = { emitter: new EventEmitter(), backlog: [], done: false };
  bus.emitter.setMaxListeners(32);
  buses.set(id, bus);
  return bus;
}

export function getNegBus(id: string): Bus | undefined {
  return buses.get(id);
}

export function emitNeg(id: string, event: NegotiationEvent) {
  const bus = buses.get(id);
  if (!bus) return;
  bus.backlog.push(event);
  bus.emitter.emit("event", event);
  if (
    event.type === "negotiation_accepted" ||
    event.type === "negotiation_rejected" ||
    event.type === "negotiation_expired" ||
    event.type === "negotiation_error"
  ) {
    bus.done = true;
  }
}
