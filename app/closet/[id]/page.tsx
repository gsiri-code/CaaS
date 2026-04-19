import GarmentDetail from "./garment-detail";

export default async function GarmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ as?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  return <GarmentDetail id={id} as={(sp.as as "alice" | "bob") ?? "alice"} />;
}
