import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { OrdersTable } from "@/components/orders/orders-table";
import { getSession } from "@/app/lib/auth";
import { getCallerQueue } from "@/app/server/queries";

export default async function CallerDashboardPage() {
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

  return (
    <>
      <MetricsGrid
        items={[
          { label: "Assigned Orders", value: rows.length },
          { label: "In Transit", value: rows.filter((row) => row.currentStage === "IN_TRANSIT").length },
          { label: "Delivered", value: rows.filter((row) => row.currentStage === "DELIVERED").length },
          { label: "RTO", value: rows.filter((row) => row.currentStage === "RTO").length },
        ]}
      />
      <OrdersTable title="Your Active Queue" rows={rows} />
    </>
  );
}
