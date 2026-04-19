import { getAppNegotiationDetail, updateAppNegotiation } from "@/lib/app-data";
import { getSessionUser } from "@/lib/session";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const user = await getSessionUser({ as: url.searchParams.get("as") ?? undefined });

  const negotiation = await getAppNegotiationDetail(id, user);
  if (!negotiation) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return Response.json(negotiation);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const user = await getSessionUser({ as: url.searchParams.get("as") ?? undefined });
  const body = await req.json();
  const { status, agreedPriceUsd, agreedHandoff } = body as {
    status?: string;
    agreedPriceUsd?: number;
    agreedHandoff?: unknown;
  };

  const updates: { status?: string; agreedPriceUsd?: number; agreedHandoff?: unknown } = {};
  if (status) updates.status = status;
  if (agreedPriceUsd !== undefined) updates.agreedPriceUsd = agreedPriceUsd;
  if (agreedHandoff !== undefined) updates.agreedHandoff = agreedHandoff;

  const updated = await updateAppNegotiation(id, user, updates);
  if (!updated) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(updated);
}
