import { CallerOpsForms } from "@/components/orders/caller-ops-forms";
import { OrdersTable } from "@/components/orders/orders-table";
import { getSession } from "@/app/lib/auth";
import { getCallerQueue } from "@/app/server/queries";

export default async function CallerOrdersPage() {
  const session = await getSession();
  const queue = await getCallerQueue(session.userId);

  const rows = queue.map((entry) => ({
    id: entry.order.id,
    customerName: entry.order.customerName,
    customerPhone: entry.order.customerPhone,
    city: entry.order.city,
    state: entry.order.state,
    trackingNumber: entry.order.trackingNumber,
    currentStage: entry.order.currentStage,
  }));

  const orderOptions = rows.map((row) => ({ id: row.id, customerName: row.customerName }));

  return (
    <>
      <CallerOpsForms orders={orderOptions} />
      <OrdersTable title="Orders Assigned to You" rows={rows} />
    </>
  );
}
