import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { getAdminSummary } from "@/app/server/queries";

export default async function ManagerDashboardPage() {
  const summary = await getAdminSummary();

  return (
    <MetricsGrid
      items={[
        { label: "Total Orders", value: summary.orderCount },
        { label: "Delivered", value: summary.deliveredCount },
        { label: "RTO", value: summary.rtoCount },
        { label: "Open Follow-ups", value: summary.openFollowUps },
        { label: "Calls Today", value: summary.todayCalls },
        { label: "Active Assignments", value: summary.activeAssignments },
      ]}
    />
  );
}
