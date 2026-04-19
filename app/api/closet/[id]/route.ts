import { getClosetGarmentDetail, updateClosetGarment } from "@/lib/app-data";
import { getSessionUser } from "@/lib/session";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const user = await getSessionUser({ as: url.searchParams.get("as") ?? undefined });

  const garment = await getClosetGarmentDetail(id, user);
  if (!garment) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(garment);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const user = await getSessionUser({ as: url.searchParams.get("as") ?? undefined });
  const body = await req.json();

  const updates: Record<string, unknown> = {};
  if (typeof body.vault === "boolean") updates.vault = body.vault;

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "nothing to update" }, { status: 400 });
  }

  const updated = await updateClosetGarment(id, user, updates);
  if (!updated) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(updated);
}
