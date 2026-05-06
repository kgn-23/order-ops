import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminSummary, getCallerPerformance } from "@/app/server/queries";

export default async function AdminDashboardPage() {
  const [summary, performance] = await Promise.all([getAdminSummary(), getCallerPerformance()]);

  return (
    <>
      <MetricsGrid
        items={[
          { label: "Total Orders", value: summary.orderCount },
          { label: "Delivered", value: summary.deliveredCount },
          { label: "RTO", value: summary.rtoCount },
          { label: "Open Follow-ups", value: summary.openFollowUps },
          { label: "Calls Today", value: summary.todayCalls },
          { label: "Active Assignments", value: summary.activeAssignments },
          { label: "Delivery Success Rate", value: `${summary.successRate}%` },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Caller productivity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {performance.map((item) => (
            <div key={item.id} className="rounded-lg border p-3">
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">
                Calls: {item._count.callLogs} • Active Assignments: {item._count.assignments}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
