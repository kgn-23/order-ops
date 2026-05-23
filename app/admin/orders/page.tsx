import { OrdersListPage } from "@/components/orders/orders-list-page";

type AdminOrdersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  return <OrdersListPage role="admin" kind="tracking" searchParams={searchParams} />;
}
