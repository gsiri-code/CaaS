import { EventEmitter } from "node:events";

export type IngestEvent =
  | { type: "photo_accepted"; batchId: string; photoId: string }
  | { type: "photo_skipped"; batchId: string; photoId: string; reason: string }
  | { type: "photo_processed"; batchId: string; photoId: string; garmentCount: number }
  | {
      type: "garment_created";
      batchId: string;
      garmentId: string;
      category: string;
      heroUrl: string;
      brandGuess: string | null;
    }
  | { type: "garment_merged"; batchId: string; garmentId: string }
  | {
      type: "batch_progress";
      batchId: string;
      photosDone: number;
      photosTotal: number;
      garmentsTotal: number;
    }
  | { type: "batch_complete"; batchId: string }
  | { type: "batch_error"; batchId: string; error: string };

export type IngestBus = {
  emitter: EventEmitter;
  backlog: IngestEvent[];
  done: boolean;
};

const globalForBus = globalThis as unknown as { _caasIngestBuses?: Map<string, IngestBus> };
const buses = globalForBus._caasIngestBuses ?? new Map<string, IngestBus>();
globalForBus._caasIngestBuses = buses;

export function createBus(batchId: string): IngestBus {
  const bus: IngestBus = { emitter: new EventEmitter(), backlog: [], done: false };
  bus.emitter.setMaxListeners(32);
  buses.set(batchId, bus);
  return bus;
}

export function getBus(batchId: string): IngestBus | undefined {
  return buses.get(batchId);
}

export function emitIngest(batchId: string, event: IngestEvent) {
  const bus = buses.get(batchId);
  if (!bus) return;
  bus.backlog.push(event);
  bus.emitter.emit("event", event);
  if (event.type === "batch_complete" || event.type === "batch_error") {
    bus.done = true;
  }
}
