import { OrdersListPage } from "@/components/orders/orders-list-page";

type CallerCommerceOrdersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function CallerCommerceOrdersPage({ searchParams }: CallerCommerceOrdersPageProps) {
  return <OrdersListPage role="caller" kind="storefront" searchParams={searchParams} />;
}
