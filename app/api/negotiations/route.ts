import { listNegotiations, spawnNegotiation } from "@/lib/server-data";
import { getSessionUser } from "@/lib/session";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const user = await getSessionUser({
    as: url.searchParams.get("as") ?? undefined,
  });

  return Response.json(await listNegotiations(user));
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const user = await getSessionUser({
    as: url.searchParams.get("as") ?? undefined,
  });
  const body = await req.json();
  const { garmentId, ownerId } = body as {
    garmentId: string;
    ownerId: string;
  };

  if (!garmentId || !ownerId) {
    return Response.json(
      { error: "garmentId and ownerId required" },
      { status: 400 },
    );
  }

  const { negotiation, error } = await spawnNegotiation(
    user,
    garmentId,
    ownerId,
  );

  if (error) {
    return Response.json({ error }, { status: 404 });
  }

  return Response.json(negotiation, { status: 201 });
}
