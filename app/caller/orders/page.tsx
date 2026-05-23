import { OrdersListPage } from "@/components/orders/orders-list-page";

type CallerOrdersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function CallerOrdersPage({ searchParams }: CallerOrdersPageProps) {
  return <OrdersListPage role="caller" kind="tracking" searchParams={searchParams} />;
}
