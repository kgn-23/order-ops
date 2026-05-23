import { OrdersListPage } from "@/components/orders/orders-list-page";

type ManagerOrdersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function ManagerOrdersPage({ searchParams }: ManagerOrdersPageProps) {
  return <OrdersListPage role="manager" kind="tracking" searchParams={searchParams} />;
}
