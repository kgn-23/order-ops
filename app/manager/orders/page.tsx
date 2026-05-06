import { AddressValidationForm } from "@/components/orders/address-validation-form";
import { OrdersTable } from "@/components/orders/orders-table";
import { TrackingSyncForm } from "@/components/orders/tracking-sync-form";
import { getFormOptions, getOrdersTable } from "@/app/server/queries";

export default async function ManagerOrdersPage() {
  const [formOptions, orders] = await Promise.all([getFormOptions(), getOrdersTable()]);

  return (
    <>
      <section className="grid gap-4 xl:grid-cols-2">
        <TrackingSyncForm orders={formOptions.orders} />
        <AddressValidationForm orders={formOptions.orders} />
      </section>
      <OrdersTable title="Manager View of Orders" rows={orders} />
    </>
  );
}
