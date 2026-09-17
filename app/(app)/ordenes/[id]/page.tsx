import OrdersDetailClient from "@/components/orders-detail-client";

export default async function Orden({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <OrdersDetailClient orderId={id} />;
}