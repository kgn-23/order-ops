import { OrdersListPage } from "@/components/orders/orders-list-page";

type ManagerCommerceOrdersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function ManagerCommerceOrdersPage({ searchParams }: ManagerCommerceOrdersPageProps) {
  return <OrdersListPage role="manager" kind="storefront" searchParams={searchParams} />;
}
