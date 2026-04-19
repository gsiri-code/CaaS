import { db, schema } from "@/db";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const user = await getSessionUser({ as: url.searchParams.get("as") ?? undefined });

  const [garment] = await db
    .select()
    .from(schema.garments)
    .where(and(eq(schema.garments.id, id), eq(schema.garments.userId, user.id)))
    .limit(1);

  if (!garment) return Response.json({ error: "not found" }, { status: 404 });

  const photos = await db
    .select({
      id: schema.garmentPhotos.id,
      photoId: schema.garmentPhotos.photoId,
      cropBbox: schema.garmentPhotos.cropBbox,
      fileUrl: schema.photos.fileUrl,
    })
    .from(schema.garmentPhotos)
    .innerJoin(schema.photos, eq(schema.garmentPhotos.photoId, schema.photos.id))
    .where(eq(schema.garmentPhotos.garmentId, id));

  return Response.json({
    ...garment,
    imageEmbedding: undefined,
    textEmbedding: undefined,
    photos,
  });
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

  const [updated] = await db
    .update(schema.garments)
    .set(updates)
    .where(and(eq(schema.garments.id, id), eq(schema.garments.userId, user.id)))
    .returning({ id: schema.garments.id, vault: schema.garments.vault });

  if (!updated) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(updated);
}
