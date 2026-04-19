import { NextRequest } from "next/server";
import {
  getNegotiationBus,
  type NegotiationEvent,
} from "@/lib/agents/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const bus = getNegotiationBus(id);
  if (!bus) return new Response("unknown negotiation_id", { status: 404 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (payload: NegotiationEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
        );
      };

      for (const event of bus.backlog) send(event);

      if (bus.done) {
        controller.close();
        return;
      }

      const onEvent = (event: NegotiationEvent) => {
        send(event);
        if (event.type === "done" || event.type === "error") {
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
