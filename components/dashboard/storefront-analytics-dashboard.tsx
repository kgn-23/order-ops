import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { StorefrontDashboardCharts } from "@/components/dashboard/storefront-dashboard-charts";
import { StorefrontDashboardFilters } from "@/components/dashboard/storefront-dashboard-filters";
import type { StorefrontDashboardPayload } from "@/lib/dashboard/storefront-analytics";
import type { StorefrontDashboardSearchParams } from "@/lib/dashboard/search-params";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StorefrontAnalyticsDashboardProps = {
  basePath: string;
  applied: StorefrontDashboardSearchParams;
  data: StorefrontDashboardPayload;
  showTeamFilter: boolean;
};

export function StorefrontAnalyticsDashboard({
  basePath,
  applied,
  data,
  showTeamFilter,
}: StorefrontAnalyticsDashboardProps) {
  if (data.isEmptyTeam) {
    return (
      <div className="space-y-4">
        <StorefrontDashboardFilters
          basePath={basePath}
          applied={applied}
          teamOptions={data.teamFilterOptions}
          showTeamFilter={false}
          scopeLabel={data.scopeLabel}
          rangeLabel={data.range.label}
        />
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            You are not assigned as a team leader. Ask an admin to link your account to a caller team.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <StorefrontDashboardFilters
        basePath={basePath}
        applied={applied}
        teamOptions={data.teamFilterOptions}
        showTeamFilter={showTeamFilter}
        scopeLabel={data.scopeLabel}
        rangeLabel={data.range.label}
      />

      <MetricsGrid
        items={[
          { label: "New storefront orders", value: data.kpis.newOrders },
          { label: "Confirmed (unique orders)", value: data.kpis.confirmed },
          { label: "Cancelled (unique orders)", value: data.kpis.cancelled },
          { label: "Calls logged", value: data.kpis.calls },
          { label: "No answer", value: data.kpis.noAnswer },
          { label: "Confirm rate (÷ calls)", value: `${data.kpis.confirmRate}%` },
          { label: "COD exported", value: data.kpis.codExported },
          { label: "COD ready now", value: data.kpis.codReadyNow },
        ]}
      />

      <StorefrontDashboardCharts data={data} />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Team performance</h2>
        {data.teamSections.length === 0 ? (
          <p className="text-sm text-muted-foreground">No teams or callers found.</p>
        ) : (
          data.teamSections.map((team) => (
            <Card key={team.teamId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{team.teamName}</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Caller</th>
                      <th className="pb-2 pr-4 font-medium text-right">Calls</th>
                      <th className="pb-2 pr-4 font-medium text-right">Confirmed</th>
                      <th className="pb-2 pr-4 font-medium text-right">Cancelled</th>
                      <th className="pb-2 pr-4 font-medium text-right">No answer</th>
                      <th className="pb-2 font-medium text-right">Confirm %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.callers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-muted-foreground">
                          No active callers on this team.
                        </td>
                      </tr>
                    ) : (
                      team.callers.map((row) => (
                        <tr key={row.callerId} className="border-b border-border/60">
                          <td className="py-2 pr-4 font-medium">{row.callerName}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">{row.calls}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">{row.confirmed}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">{row.cancelled}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">{row.noAnswer}</td>
                          <td className="py-2 text-right tabular-nums">{row.confirmRate}%</td>
                        </tr>
                      ))
                    )}
                    <tr className="bg-muted/40 font-medium">
                      <td className="py-2 pr-4">{team.totals.label}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{team.totals.calls}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{team.totals.confirmed}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{team.totals.cancelled}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{team.totals.noAnswer}</td>
                      <td className="py-2 text-right tabular-nums">{team.totals.confirmRate}%</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
