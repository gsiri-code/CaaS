import { listClosetGarments } from "@/lib/app-data";
import { getSessionUser } from "@/lib/session";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const user = await getSessionUser({ as: url.searchParams.get("as") ?? undefined });
  return Response.json(await listClosetGarments(user));
}
