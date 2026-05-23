import Link from "next/link";

import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { getCallerDashboardSummary } from "@/lib/dashboard/queries";

function formatDue(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default async function CallerDashboardPage() {
  const session = await getSession();
  const summary = await getCallerDashboardSummary(session.userId);

  return (
    <>
      <MetricsGrid
        items={[
          { label: "Assigned Orders", value: summary.assignedOrders },
          { label: "Not Called", value: summary.notCalledOrders },
          { label: "Overdue Follow-ups", value: summary.overdueFollowUps },
          { label: "Follow-ups Due Today", value: summary.dueTodayFollowUps },
          { label: "Calls today (IST)", value: summary.callsToday },
        ]}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/caller/orders?page=1&pageSize=50&searchKey=customerName&stage=ALL&attemptFilter=ALL&followUpFilter=ALL&sortBy=createdAt&sortDir=desc&mode=focus">
                Open Focus Mode
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/caller/orders?page=1&pageSize=50&searchKey=customerName&stage=ALL&attemptFilter=NOT_CALLED&followUpFilter=ALL&sortBy=createdAt&sortDir=desc">
                Not Called Queue
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/caller/orders?page=1&pageSize=50&searchKey=customerName&stage=ALL&attemptFilter=ALL&followUpFilter=WITH_FOLLOW_UP&sortBy=createdAt&sortDir=desc">
                Follow-up Queue
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/caller/call-logs?page=1&pageSize=50&searchKey=orderId&outcome=ALL&stage=ALL&sortBy=calledAt&sortDir=desc">
                Open Call Logs
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next follow-ups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.upcomingFollowUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming follow-ups.</p>
            ) : (
              summary.upcomingFollowUps.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <p className="font-medium">{item.customerName}</p>
                  <p className="text-sm text-muted-foreground">{item.customerPhone}</p>
                  <p className="text-xs text-muted-foreground">Due: {formatDue(item.dueAt)}</p>
                  <p className="mt-1 line-clamp-2 text-sm">{item.notes}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
