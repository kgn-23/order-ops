"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  CallLogPageRow,
  CallLogsOutcomeFilter,
  CallLogsSearchKey,
  CallLogsSortBy,
  CallLogsSortDir,
  CallLogsStageFilter,
} from "@/lib/call-logs/queries";
import { CallOutcomeBadge, ShipmentStageBadge } from "@/components/orders/status-badges";
import { CALL_OUTCOME_LABELS, CALL_OUTCOME_VALUES } from "@/lib/orders/call-outcomes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CallLogsTableProps = {
  title: string;
  rows: CallLogPageRow[];
  counts: {
    total: number;
    today: number;
    called: number;
    noAnswer: number;
    busy: number;
    failed: number;
    invalidNumber: number;
    other: number;
    avgDurationS: number;
  };
  topCallers: Array<{ callerId: string; callerName: string; callCount: number }>;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  filters: {
    searchKey: CallLogsSearchKey;
    q: string;
    outcome: CallLogsOutcomeFilter;
    stage: CallLogsStageFilter;
    sortBy: CallLogsSortBy;
    sortDir: CallLogsSortDir;
  };
  showCallerColumn?: boolean;
  showTopCallers?: boolean;
};

function formatCalledAt(iso: string) {
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

function buildHref(params: {
  page: number;
  pageSize: number;
  searchKey: CallLogsSearchKey;
  q: string;
  outcome: CallLogsOutcomeFilter;
  stage: CallLogsStageFilter;
  sortBy: CallLogsSortBy;
  sortDir: CallLogsSortDir;
}) {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page));
  sp.set("pageSize", String(params.pageSize));
  sp.set("searchKey", params.searchKey);
  if (params.q) sp.set("q", params.q);
  sp.set("outcome", params.outcome);
  sp.set("stage", params.stage);
  sp.set("sortBy", params.sortBy);
  sp.set("sortDir", params.sortDir);
  return `?${sp.toString()}`;
}

export function CallLogsTable({
  title,
  rows,
  counts,
  topCallers,
  pagination,
  filters,
  showCallerColumn = true,
  showTopCallers = true,
}: CallLogsTableProps) {
  const [showAllCallers, setShowAllCallers] = useState(false);
  const [showMobileKpis, setShowMobileKpis] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const top5 = useMemo(() => topCallers.slice(0, 5), [topCallers]);
  const visibleCallers = showAllCallers ? topCallers : top5;
  const baseParams = useMemo(
    () => ({
      pageSize: pagination.pageSize,
      searchKey: filters.searchKey,
      q: filters.q,
      outcome: filters.outcome,
      stage: filters.stage,
      sortBy: filters.sortBy,
      sortDir: filters.sortDir,
    }),
    [pagination.pageSize, filters],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 md:hidden">
          <Button type="button" variant="outline" size="sm" onClick={() => setShowMobileFilters((prev) => !prev)}>
            {showMobileFilters ? "Hide filters" : "Show filters"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowMobileKpis((prev) => !prev)}>
            {showMobileKpis ? "Hide KPIs" : "Show KPIs"}
          </Button>
        </div>

        <div className={`${showMobileKpis ? "grid" : "hidden"} gap-2 md:grid md:grid-cols-3 xl:grid-cols-7`}>
          <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Total Calls</p><p className="text-lg font-semibold">{counts.total}</p></div>
          <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Today (IST)</p><p className="text-lg font-semibold">{counts.today}</p></div>
          <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">No Answer</p><p className="text-lg font-semibold">{counts.noAnswer}</p></div>
          <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Called</p><p className="text-lg font-semibold">{counts.called}</p></div>
          <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Busy</p><p className="text-lg font-semibold">{counts.busy}</p></div>
          <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Failed</p><p className="text-lg font-semibold">{counts.failed}</p></div>
          <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Invalid Number</p><p className="text-lg font-semibold">{counts.invalidNumber}</p></div>
          <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Other</p><p className="text-lg font-semibold">{counts.other}</p></div>
          <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Avg Duration (s)</p><p className="text-lg font-semibold">{counts.avgDurationS}</p></div>
        </div>

        {showTopCallers ? (
          <div className="rounded-md border p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Caller summary</p>
              {topCallers.length > 5 ? (
                <Button variant="outline" size="sm" type="button" onClick={() => setShowAllCallers((prev) => !prev)}>
                  {showAllCallers ? "Show top 5" : "Show all"}
                </Button>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {visibleCallers.map((caller) => (
                <div key={caller.callerId} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <span>{caller.callerName}</span>
                  <Badge variant="secondary">{caller.callCount}</Badge>
                </div>
              ))}
              {visibleCallers.length === 0 ? <p className="text-sm text-muted-foreground">No calls found.</p> : null}
            </div>
          </div>
        ) : null}

        <form
          className={`${showMobileFilters ? "grid" : "hidden"} gap-3 md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7`}
          method="get"
        >
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="sortBy" value={filters.sortBy} />
          <input type="hidden" name="sortDir" value={filters.sortDir} />
          <div className="flex flex-col gap-2"><label className="text-sm font-medium" htmlFor="q">Search</label><Input id="q" name="q" defaultValue={filters.q} placeholder="Search value" /></div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="searchKey">Search key</label>
            <select id="searchKey" name="searchKey" defaultValue={filters.searchKey} className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="orderId">Order ID</option><option value="customerName">Customer Name</option><option value="customerPhone">Customer Phone</option><option value="callerName">Caller Name</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="outcome">Outcome</label>
            <select id="outcome" name="outcome" defaultValue={filters.outcome} className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="ALL">All</option>
              {CALL_OUTCOME_VALUES.map((value) => (
                <option key={value} value={value}>
                  {CALL_OUTCOME_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="stage">Order stage at call</label>
            <select id="stage" name="stage" defaultValue={filters.stage} className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="ALL">All</option><option value="BOOKED">Booked</option><option value="IN_TRANSIT">In Transit</option><option value="DELIVERED">Delivered</option><option value="RTO">RTO</option><option value="OTHER">Other</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="pageSize">Rows per page</label>
            <select id="pageSize" name="pageSize" defaultValue={String(pagination.pageSize)} className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="50">50</option><option value="100">100</option><option value="200">200</option><option value="300">300</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit">Apply</Button>
            <Button type="button" variant="outline" asChild>
              <Link href="?page=1&pageSize=50&searchKey=orderId&outcome=ALL&stage=ALL&sortBy=calledAt&sortDir=desc">Reset</Link>
            </Button>
          </div>
        </form>

        <div className="flex flex-col gap-3 md:hidden">
          {rows.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">No call logs found.</p>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="rounded-xl border bg-card p-3 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-primary">#{row.orderId.slice(-5).toUpperCase()}</p>
                  <div className="flex items-center gap-1.5">
                    <CallOutcomeBadge outcome={row.outcome} />
                    <ShipmentStageBadge stage={row.orderStage} />
                  </div>
                </div>

                <div className="mb-2">
                  <p className="text-lg font-semibold leading-tight">{row.customerName}</p>
                  <p className="text-sm text-muted-foreground">{row.customerPhone}</p>
                </div>

                <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                  {showCallerColumn ? <p className="truncate text-muted-foreground">Caller: {row.callerName}</p> : <span />}
                  <p className="shrink-0 text-xs text-muted-foreground">{formatCalledAt(row.calledAt)}</p>
                </div>

                <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                  Notes: <span className="font-medium text-foreground">{row.notes ?? "—"}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden overflow-auto rounded-md border md:block">
          <table className="w-full min-w-[940px] text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Called At</th>
                <th className="px-3 py-2 text-left font-medium">Order</th>
                <th className="px-3 py-2 text-left font-medium">Customer</th>
                {showCallerColumn ? <th className="px-3 py-2 text-left font-medium">Caller</th> : null}
                <th className="px-3 py-2 text-left font-medium">Outcome</th>
                <th className="px-3 py-2 text-left font-medium">Stage at Call</th>
                <th className="px-3 py-2 text-left font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={showCallerColumn ? 7 : 6} className="px-3 py-6 text-center text-muted-foreground">No call logs found.</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2">{formatCalledAt(row.calledAt)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.orderId}</td>
                    <td className="px-3 py-2">{row.customerName}<p className="text-xs text-muted-foreground">{row.customerPhone}</p></td>
                    {showCallerColumn ? <td className="px-3 py-2">{row.callerName}</td> : null}
                    <td className="px-3 py-2">
                      <CallOutcomeBadge outcome={row.outcome} />
                    </td>
                    <td className="px-3 py-2">
                      <ShipmentStageBadge stage={row.orderStage} />
                    </td>
                    <td className="max-w-[360px] truncate px-3 py-2" title={row.notes ?? ""}>{row.notes ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} logs)</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} asChild><Link href={buildHref({ page: 1, ...baseParams })}>First</Link></Button>
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} asChild><Link href={buildHref({ page: Math.max(1, pagination.page - 1), ...baseParams })}>Prev</Link></Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} asChild><Link href={buildHref({ page: Math.min(pagination.totalPages, pagination.page + 1), ...baseParams })}>Next</Link></Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} asChild><Link href={buildHref({ page: pagination.totalPages, ...baseParams })}>Last</Link></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
