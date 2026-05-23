"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import type { StorefrontDashboardPayload } from "@/lib/dashboard/storefront-analytics";
import { STOREFRONT_ORDER_STATUS_LABELS } from "@/lib/orders/storefront-order-status";
import type { StorefrontOrderStatus } from "@/lib/orders/storefront-order-status";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const funnelConfig = {
  count: { label: "Transitions", color: "hsl(var(--chart-1))" },
};

const trendConfig = {
  calls: { label: "Calls", color: "hsl(var(--chart-1))" },
  confirmed: { label: "Confirmed", color: "hsl(var(--chart-2))" },
};

const callerConfig = {
  confirmed: { label: "Confirmed orders", color: "hsl(var(--chart-2))" },
};

type StorefrontDashboardChartsProps = {
  data: Pick<StorefrontDashboardPayload, "statusFunnel" | "dailyTrend" | "teamSections" | "range">;
};

export function StorefrontDashboardCharts({ data }: StorefrontDashboardChartsProps) {
  const multiDay = data.range.from !== data.range.to;

  const callerChartData = data.teamSections
    .flatMap((team) =>
      team.callers.map((c) => ({
        name: data.teamSections.length > 1 ? `${c.callerName} (${team.teamName})` : c.callerName,
        confirmed: c.confirmed,
      })),
    )
    .filter((row) => row.confirmed > 0)
    .sort((a, b) => b.confirmed - a.confirmed)
    .slice(0, 12);

  const funnelData = data.statusFunnel.map((row) => ({
    status: STOREFRONT_ORDER_STATUS_LABELS[row.status as StorefrontOrderStatus],
    count: row.count,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {callerChartData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Confirmations by caller</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={callerConfig} className="aspect-[16/10] w-full">
              <BarChart data={callerChartData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="confirmed" fill="var(--color-confirmed)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Confirmations by caller</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No confirmations in this range.</p>
          </CardContent>
        </Card>
      )}

      {multiDay && data.dailyTrend.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily calls &amp; confirmations</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trendConfig} className="aspect-[16/10] w-full">
              <LineChart data={data.dailyTrend}>
                <CartesianGrid />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="calls" stroke="var(--color-calls)" strokeWidth={2} dot={false} />
                <Line
                  type="monotone"
                  dataKey="confirmed"
                  stroke="var(--color-confirmed)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status transitions</CardTitle>
          </CardHeader>
          <CardContent>
            {funnelData.some((r) => r.count > 0) ? (
              <ChartContainer config={funnelConfig} className="aspect-[16/10] w-full">
                <BarChart data={funnelData}>
                  <CartesianGrid />
                  <XAxis dataKey="status" />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No status changes in this range.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
