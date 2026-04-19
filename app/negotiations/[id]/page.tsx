import { notFound } from "next/navigation";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { garments, negotiationMessages, rentalNegotiations, users } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import NegotiationClient from "./negotiation-client";

export const dynamic = "force-dynamic";

export default async function NegotiationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ as?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await getSessionUser(sp);

  const [neg] = await db.select().from(rentalNegotiations).where(eq(rentalNegotiations.id, id));
  if (!neg) notFound();

  const [g] = await db.select().from(garments).where(eq(garments.id, neg.garmentId));
  const [requester] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, neg.requesterId));
  const [owner] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, neg.ownerId));

  const initialMessages = await db
    .select({
      id: negotiationMessages.id,
      speaker: negotiationMessages.speaker,
      content: negotiationMessages.content,
      toolCall: negotiationMessages.toolCall,
      createdAt: negotiationMessages.createdAt,
    })
    .from(negotiationMessages)
    .where(eq(negotiationMessages.negotiationId, id))
    .orderBy(asc(negotiationMessages.createdAt));

  return (
    <div className="px-6 py-8 max-w-6xl">
      <Link href="/negotiations" className="text-xs underline text-black/60 dark:text-white/60">
        ← all negotiations
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Negotiation</h1>
      <p className="text-sm text-black/60 dark:text-white/60">
        {requester?.name} wants to rent from {owner?.name}. Viewing as {user.name}.
      </p>

      {g && (
        <div className="mt-4 flex items-center gap-4 rounded border border-black/10 dark:border-white/10 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={g.heroImageUrl} alt={g.description} className="h-20 w-20 object-cover rounded" />
          <div className="text-sm">
            <div className="font-medium capitalize">{g.subcategory ?? g.category}</div>
            <div className="text-black/60 dark:text-white/60 text-xs">{g.description}</div>
            {g.estimatedValueUsd && (
              <div className="text-xs text-black/50 dark:text-white/50">
                est. value ${g.estimatedValueUsd}
              </div>
            )}
          </div>
        </div>
      )}

      <NegotiationClient
        id={id}
        initialStatus={neg.status}
        initialMessages={initialMessages}
        initialDeal={
          neg.status === "accepted" && neg.agreedPriceUsd
            ? {
                priceUsd: neg.agreedPriceUsd,
                handoff: neg.agreedHandoff,
              }
            : null
        }
        requesterName={requester?.name ?? "Requester"}
        ownerName={owner?.name ?? "Owner"}
        asKey={user.name.toLowerCase() as "alice" | "bob"}
      />
    </div>
  );
}
