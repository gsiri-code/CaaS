import { NextRequest } from "next/server";
import { getBus, type IngestEvent } from "@/lib/ingest/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const batchId = req.nextUrl.searchParams.get("batch_id");
  if (!batchId) return new Response("batch_id required", { status: 400 });

  const bus = getBus(batchId);
  if (!bus) return new Response("unknown batch_id", { status: 404 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (payload: IngestEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      for (const event of bus.backlog) send(event);

      if (bus.done) {
        controller.close();
        return;
      }

      const onEvent = (event: IngestEvent) => {
        send(event);
        if (event.type === "batch_complete" || event.type === "batch_error") {
          cleanup();
          controller.close();
        }
      };

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          cleanup();
        }
      }, 15000);

      const cleanup = () => {
        clearInterval(heartbeat);
        bus.emitter.off("event", onEvent);
      };

      bus.emitter.on("event", onEvent);

      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
