import { OrdersListPage } from "@/components/orders/orders-list-page";

type AdminCommerceOrdersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function AdminCommerceOrdersPage({ searchParams }: AdminCommerceOrdersPageProps) {
  return <OrdersListPage role="admin" kind="storefront" searchParams={searchParams} />;
}
