import { NextRequest } from "next/server";
import { getNegBus } from "@/lib/agents/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const bus = getNegBus(id);
  if (!bus) return new Response("unknown negotiation id", { status: 404 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      for (const event of bus.backlog) send(event);

      if (bus.done) {
        controller.close();
        return;
      }

      const onEvent = (event: unknown) => {
        send(event);
        const t = (event as { type?: string }).type;
        if (
          t === "negotiation_accepted" ||
          t === "negotiation_rejected" ||
          t === "negotiation_expired" ||
          t === "negotiation_error"
        ) {
          controller.close();
          cleanup();
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
