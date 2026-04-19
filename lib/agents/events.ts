import { EventEmitter } from "node:events";

export type NegotiationEvent =
  | {
      type: "message";
      negotiationId: string;
      message: {
        id: string;
        speaker: string;
        content: string;
        toolCall: { name: string; result?: string } | null;
        createdAt: string;
      };
    }
  | {
      type: "status_change";
      negotiationId: string;
      status: string;
      agreedPriceUsd?: number | null;
      agreedHandoff?: { type: string; datetime?: string; location?: string } | null;
    }
  | { type: "turn"; negotiationId: string; turnCount: number }
  | { type: "done"; negotiationId: string }
  | { type: "error"; negotiationId: string; error: string };

export type NegotiationBus = {
  emitter: EventEmitter;
  backlog: NegotiationEvent[];
  done: boolean;
};

const globalForBus = globalThis as unknown as {
  _caasNegotiationBuses?: Map<string, NegotiationBus>;
};
const buses =
  globalForBus._caasNegotiationBuses ?? new Map<string, NegotiationBus>();
globalForBus._caasNegotiationBuses = buses;

export function createNegotiationBus(negotiationId: string): NegotiationBus {
  const bus: NegotiationBus = {
    emitter: new EventEmitter(),
    backlog: [],
    done: false,
  };
  bus.emitter.setMaxListeners(32);
  buses.set(negotiationId, bus);
  return bus;
}

export function getNegotiationBus(
  negotiationId: string,
): NegotiationBus | undefined {
  return buses.get(negotiationId);
}

export function emitNegotiation(
  negotiationId: string,
  event: NegotiationEvent,
) {
  const bus = buses.get(negotiationId);
  if (!bus) return;
  bus.backlog.push(event);
  bus.emitter.emit("event", event);
  if (event.type === "done" || event.type === "error") {
    bus.done = true;
  }
}
