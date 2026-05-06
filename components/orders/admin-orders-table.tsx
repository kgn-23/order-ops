"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import Link from "next/link";
import { ArrowUpIcon, PhoneIcon } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";

import { assignOrders, bulkSetOrderStage } from "@/app/actions/phase1";
import type {
  OrdersAttemptFilter,
  OrdersFollowUpFilter,
  OrdersPageRow,
  OrdersSearchKey,
  OrdersSortBy,
  OrdersSortDir,
  OrdersStageFilter,
} from "@/app/server/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrderDetailsDrawer } from "@/components/orders/order-details-drawer";
import { OrderRowActions } from "@/components/orders/order-row-actions";

const ROW_HEIGHT_PX = 52;

export type AdminOrdersTableProps = {
  title: string;
  rows: OrdersPageRow[];
  counts: {
    total: number;
    assigned: number;
    unassigned: number;
    delivered: number;
    inTransit: number;
    rto: number;
    calledOrders: number;
    notCalledOrders: number;
    withFollowUpOrders: number;
    withoutFollowUpOrders: number;
    totalFollowUps: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: {
    searchKey: OrdersSearchKey;
    q: string;
    stage: OrdersStageFilter;
    attemptFilter: OrdersAttemptFilter;
    followUpFilter: OrdersFollowUpFilter;
    sortBy: OrdersSortBy;
    sortDir: OrdersSortDir;
  };
  callers: Array<{ id: string; name: string; email: string }>;
  actions?: ReactNode;
  enableBulkActions?: boolean;
  showLastAttemptColumn?: boolean;
  extraQueryParams?: Record<string, string | undefined>;
};

function buildHref(params: {
  page: number;
  pageSize: number;
  searchKey: OrdersSearchKey;
  q: string;
  stage: OrdersStageFilter;
  attemptFilter: OrdersAttemptFilter;
  followUpFilter: OrdersFollowUpFilter;
  sortBy: OrdersSortBy;
  sortDir: OrdersSortDir;
  extraQueryParams?: Record<string, string | undefined>;
}) {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page));
  sp.set("pageSize", String(params.pageSize));
  sp.set("searchKey", params.searchKey);
  if (params.q) sp.set("q", params.q);
  sp.set("stage", params.stage);
  sp.set("attemptFilter", params.attemptFilter);
  sp.set("followUpFilter", params.followUpFilter);
  sp.set("sortBy", params.sortBy);
  sp.set("sortDir", params.sortDir);
  if (params.extraQueryParams) {
    Object.entries(params.extraQueryParams).forEach(([key, value]) => {
      if (value) sp.set(key, value);
    });
  }
  return `?${sp.toString()}`;
}

function nextSort(
  column: OrdersSortBy,
  filters: AdminOrdersTableProps["filters"],
): { sortBy: OrdersSortBy; sortDir: OrdersSortDir } {
  if (filters.sortBy === column) {
    return { sortBy: column, sortDir: filters.sortDir === "asc" ? "desc" : "asc" };
  }
  return { sortBy: column, sortDir: "desc" };
}

function ariaSortForColumn(column: OrdersSortBy, filters: AdminOrdersTableProps["filters"]) {
  if (filters.sortBy !== column) return "none" as const;
  return filters.sortDir === "asc" ? ("ascending" as const) : ("descending" as const);
}

function formatCreated(iso: string) {
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

function formatAttempt(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function toTelHref(phone: string) {
  const normalized = phone.replace(/[^\d+]/g, "");
  return `tel:${normalized}`;
}

export function AdminOrdersTable({
  title,
  rows,
  counts,
  pagination,
  filters,
  callers,
  actions,
  enableBulkActions = true,
  showLastAttemptColumn = true,
  extraQueryParams,
}: AdminOrdersTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showAllKpis, setShowAllKpis] = useState(false);
  const [showMobileKpis, setShowMobileKpis] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [stageBulk, setStageBulk] = useState<string>("");
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSelected(new Set());
  }, [rows]);

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 240);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT_PX,
    overscan: 12,
  });

  const baseParams = useMemo(
    () => ({
      pageSize: pagination.pageSize,
      searchKey: filters.searchKey,
      q: filters.q,
      stage: filters.stage,
      attemptFilter: filters.attemptFilter,
      followUpFilter: filters.followUpFilter,
      sortBy: filters.sortBy,
      sortDir: filters.sortDir,
      extraQueryParams,
    }),
    [pagination.pageSize, filters, extraQueryParams],
  );

  const sortLink = useCallback(
    (column: OrdersSortBy) => {
      const ns = nextSort(column, filters);
      return buildHref({
        page: 1,
        ...baseParams,
        sortBy: ns.sortBy,
        sortDir: ns.sortDir,
      });
    },
    [baseParams, filters],
  );

  const pageHref = useCallback(
    (page: number) =>
      buildHref({
        page,
        ...baseParams,
        sortBy: filters.sortBy,
        sortDir: filters.sortDir,
      }),
    [baseParams, filters.sortBy, filters.sortDir],
  );

  const allIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;
  const headerCheckboxState =
    allIds.length === 0 ? false : allSelected ? true : someSelected ? "indeterminate" : false;

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  }, [allIds, allSelected]);

  const toggleRow = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const runBulkAssign = useCallback(() => {
    if (selected.size === 0) {
      toast.message("Select at least one order.");
      return;
    }
    if (!assigneeId) {
      toast.message("Choose a caller to assign.");
      return;
    }
    const ids = Array.from(selected);
    startTransition(async () => {
      try {
        await assignOrders({
          orderIds: ids,
          assigneeId,
          assignmentType: "MANUAL",
        });
        toast.success(`Assigned ${ids.length} order(s).`);
        setSelected(new Set());
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Assignment failed.");
      }
    });
  }, [assigneeId, selected]);

  const runBulkStage = useCallback(() => {
    if (selected.size === 0) {
      toast.message("Select at least one order.");
      return;
    }
    if (!stageBulk) {
      toast.message("Choose a stage.");
      return;
    }
    const ids = Array.from(selected);
    startTransition(async () => {
      try {
        await bulkSetOrderStage({
          orderIds: ids,
          stage: stageBulk as "BOOKED" | "IN_TRANSIT" | "DELIVERED" | "RTO" | "OTHER",
        });
        toast.success(`Updated stage for ${ids.length} order(s).`);
        setSelected(new Set());
        setStageBulk("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Stage update failed.");
      }
    });
  }, [selected, stageBulk]);

  const virtualRows = rowVirtualizer.getVirtualItems();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardAction className="flex items-center gap-2">
          {actions}
          {enableBulkActions ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowBulkActions((prev) => !prev)}
              aria-expanded={showBulkActions}
              aria-controls="admin-orders-bulk-actions"
            >
              {showBulkActions ? "Hide bulk actions" : "Show bulk actions"}
            </Button>
          ) : null}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 md:hidden">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowMobileFilters((prev) => !prev)}>
              {showMobileFilters ? "Hide filters" : "Show filters"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowMobileKpis((prev) => !prev)}>
              {showMobileKpis ? "Hide KPIs" : "Show KPIs"}
            </Button>
          </div>
          <div className={`${showMobileKpis ? "grid" : "hidden"} gap-2 md:grid md:grid-cols-2 xl:grid-cols-4`}>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-semibold">{counts.total}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Not Called</p>
              <p className="text-lg font-semibold">{counts.notCalledOrders}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">With Follow-up</p>
              <p className="text-lg font-semibold">{counts.withFollowUpOrders}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Without Follow-up</p>
              <p className="text-lg font-semibold">{counts.withoutFollowUpOrders}</p>
            </div>
          </div>
          {showAllKpis ? (
            <div
              className={`${
                showMobileKpis ? "grid" : "hidden"
              } gap-2 md:grid md:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-8`}
            >
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Assigned</p>
                <p className="text-lg font-semibold">{counts.assigned}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Unassigned</p>
                <p className="text-lg font-semibold">{counts.unassigned}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Delivered</p>
                <p className="text-lg font-semibold">{counts.delivered}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">In Transit</p>
                <p className="text-lg font-semibold">{counts.inTransit}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">RTO</p>
                <p className="text-lg font-semibold">{counts.rto}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Called</p>
                <p className="text-lg font-semibold">{counts.calledOrders}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Total Follow-ups</p>
                <p className="text-lg font-semibold">{counts.totalFollowUps}</p>
              </div>
            </div>
          ) : null}
          <div className={showMobileKpis ? "block" : "hidden md:block"}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAllKpis((prev) => !prev)}>
              {showAllKpis ? "Show less KPIs" : "Show more KPIs"}
            </Button>
          </div>
        </div>

        <form
          className={`${showMobileFilters ? "grid" : "hidden"} gap-3 md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7`}
          method="get"
        >
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="sortBy" value={filters.sortBy} />
          <input type="hidden" name="sortDir" value={filters.sortDir} />
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="q">
              Search
            </label>
            <Input id="q" name="q" defaultValue={filters.q} placeholder="Enter search value" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="searchKey">
              Search key
            </label>
            <select
              id="searchKey"
              name="searchKey"
              defaultValue={filters.searchKey}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="customerName">Customer Name</option>
              <option value="customerPhone">Customer Phone</option>
              <option value="trackingNumber">Tracking Number</option>
              <option value="city">City</option>
              <option value="state">State</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="stage">
              Stage
            </label>
            <select
              id="stage"
              name="stage"
              defaultValue={filters.stage}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="ALL">All</option>
              <option value="BOOKED">Booked</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DELIVERED">Delivered</option>
              <option value="RTO">RTO</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="pageSize">
              Rows per page
            </label>
            <select
              id="pageSize"
              name="pageSize"
              defaultValue={String(pagination.pageSize)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="300">300</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="attemptFilter">
              Call Status
            </label>
            <select
              id="attemptFilter"
              name="attemptFilter"
              defaultValue={filters.attemptFilter}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="ALL">All</option>
              <option value="CALLED">Called</option>
              <option value="NOT_CALLED">Not Called</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="followUpFilter">
              Follow-up
            </label>
            <select
              id="followUpFilter"
              name="followUpFilter"
              defaultValue={filters.followUpFilter}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="ALL">All</option>
              <option value="WITH_FOLLOW_UP">With Follow-up</option>
              <option value="WITHOUT_FOLLOW_UP">Without Follow-up</option>
            </select>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Button type="submit">Apply</Button>
            <Button type="button" variant="outline" asChild>
              <Link
                href={buildHref({
                  page: 1,
                  pageSize: 50,
                  searchKey: "customerName",
                  q: "",
                  stage: "ALL",
                  attemptFilter: "ALL",
                  followUpFilter: "ALL",
                  sortBy: "createdAt",
                  sortDir: "desc",
                  extraQueryParams,
                })}
              >
                Reset
              </Link>
            </Button>
          </div>
        </form>

        {enableBulkActions && showBulkActions ? (
          <div id="admin-orders-bulk-actions" className="flex flex-col gap-3 rounded-md border p-3">
            <p className="text-sm font-medium">Bulk actions</p>
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
              <div className="flex min-w-[200px] flex-col gap-2">
                <span className="text-xs text-muted-foreground">Assign to caller</span>
                <Select value={assigneeId || undefined} onValueChange={setAssigneeId}>
                  <SelectTrigger className="w-full lg:w-[220px]" aria-label="Select caller for bulk assign">
                    <SelectValue placeholder="Select caller" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {callers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" disabled={pending || !someSelected} onClick={runBulkAssign}>
                Assign selected
              </Button>
              <div className="flex min-w-[200px] flex-col gap-2">
                <span className="text-xs text-muted-foreground">Set stage (manual)</span>
                <Select value={stageBulk || undefined} onValueChange={setStageBulk}>
                  <SelectTrigger className="w-full lg:w-[200px]" aria-label="Select stage for bulk update">
                    <SelectValue placeholder="Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="BOOKED">Booked</SelectItem>
                      <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                      <SelectItem value="DELIVERED">Delivered</SelectItem>
                      <SelectItem value="RTO">RTO</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="secondary" disabled={pending || !someSelected} onClick={runBulkStage}>
                Set stage on selected
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {someSelected ? `${selected.size} selected` : "No rows selected"} · Manual stage does not sync India Post
              tracking.
            </p>
          </div>
        ) : null}

        {/* Mobile top pagination */}
        <div className="sticky top-2 z-20 rounded-lg border bg-background/95 p-2 shadow-sm backdrop-blur md:hidden">
          <div className="grid grid-cols-4 gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} asChild>
              <Link href={pageHref(1)} aria-disabled={pagination.page <= 1}>
                First
              </Link>
            </Button>
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} asChild>
              <Link href={pageHref(Math.max(1, pagination.page - 1))} aria-disabled={pagination.page <= 1}>
                Prev
              </Link>
            </Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} asChild>
              <Link
                href={pageHref(Math.min(pagination.totalPages, pagination.page + 1))}
                aria-disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </Link>
            </Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} asChild>
              <Link href={pageHref(pagination.totalPages)} aria-disabled={pagination.page >= pagination.totalPages}>
                Last
              </Link>
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Page {pagination.page} / {pagination.totalPages}
          </p>
        </div>

        {/* Mobile cards */}
        <div className="flex flex-col gap-3 md:hidden">
          {rows.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">No orders found for the selected filters.</p>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="rounded-xl border bg-card p-3 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {enableBulkActions ? (
                      <Checkbox
                        checked={selected.has(row.id)}
                        onCheckedChange={() => toggleRow(row.id)}
                        aria-label={`Select order ${row.customerName}`}
                      />
                    ) : null}
                    <p className="text-sm font-semibold text-primary">#{row.id.slice(-5).toUpperCase()}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline">{row.currentStage}</Badge>
                    <Badge variant="secondary">{row.trackingNumber ? "TRACKED" : "NO TRACKING"}</Badge>
                  </div>
                </div>

                <div className="mb-2">
                  <p className="text-lg font-semibold leading-tight">{row.customerName}</p>
                  <p className="text-sm text-muted-foreground">{row.customerPhone}</p>
                </div>

                <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                  <p className="truncate text-muted-foreground">
                    {row.city}, {row.state}
                  </p>
                  <p className="shrink-0 text-xs text-muted-foreground">{formatCreated(row.createdAt)}</p>
                </div>

                {showLastAttemptColumn ? (
                  <div className="mb-3 flex items-center gap-2 text-sm">
                    <p className="text-muted-foreground">Last call</p>
                    <Badge variant="secondary">{row.lastAttemptOutcome ?? "NOT_CALLED"}</Badge>
                    <p className="min-h-4 text-xs text-muted-foreground">{formatAttempt(row.lastAttemptAt)}</p>
                  </div>
                ) : null}

                <div className="mb-2 rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                  Assigned: <span className="font-medium text-foreground">{row.assignedTo ?? "Unassigned"}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button asChild className="bg-green-600 text-white hover:bg-green-700">
                    <a href={toTelHref(row.customerPhone)}>
                      <PhoneIcon className="mr-1 size-4" />
                      Call
                    </a>
                  </Button>
                  <OrderRowActions orderId={row.id} customerName={row.customerName} />
                  <OrderDetailsDrawer orderId={row.id} customerName={row.customerName} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop: virtualized grid (aligns columns; sticky header) */}
        <div
          ref={scrollRef}
          className="hidden max-h-[min(70vh,780px)] overflow-auto rounded-md border md:block"
          role="grid"
          aria-label="Orders list"
        >
          <div
            className={`sticky top-0 z-10 grid gap-2 border-b bg-background px-2 py-2 text-xs font-medium text-muted-foreground sm:text-sm ${
              showLastAttemptColumn
                ? "grid-cols-[40px_112px_minmax(120px,1fr)_120px_minmax(100px,1fr)_120px_128px_140px_104px_150px_88px]"
                : "grid-cols-[40px_112px_minmax(120px,1fr)_120px_minmax(100px,1fr)_120px_128px_104px_150px_88px]"
            }`}
            role="row"
          >
            <div className="flex items-center justify-center" role="columnheader">
              {enableBulkActions ? (
                <Checkbox
                  checked={headerCheckboxState}
                  onCheckedChange={toggleAll}
                  aria-label="Select all rows on this page"
                />
              ) : null}
            </div>
            <div role="columnheader">
              <Link
                href={sortLink("createdAt")}
                className="text-foreground underline-offset-4 hover:underline"
                aria-sort={ariaSortForColumn("createdAt", filters)}
              >
                Created
              </Link>
            </div>
            <div role="columnheader">
              <Link
                href={sortLink("customerName")}
                className="text-foreground underline-offset-4 hover:underline"
                aria-sort={ariaSortForColumn("customerName", filters)}
              >
                Customer
              </Link>
            </div>
            <div role="columnheader">Phone</div>
            <div role="columnheader">Location</div>
            <div role="columnheader">Tracking</div>
            <div role="columnheader">Assigned To</div>
            {showLastAttemptColumn ? <div role="columnheader">Last Attempt</div> : null}
            <div role="columnheader">
              <Link
                href={sortLink("currentStage")}
                className="text-foreground underline-offset-4 hover:underline"
                aria-sort={ariaSortForColumn("currentStage", filters)}
              >
                Status
              </Link>
            </div>
            <div role="columnheader">Actions</div>
            <div role="columnheader">More</div>
          </div>
          {rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No orders found for the selected filters.</p>
          ) : (
            <div className="relative text-[13px]" style={{ height: rowVirtualizer.getTotalSize() }}>
              {virtualRows.map((vr) => {
                const row = rows[vr.index];
                if (!row) return null;
                return (
                  <div
                    key={row.id}
                    role="row"
                    className={`absolute left-0 grid w-full gap-2 border-b px-2 py-2 ${
                      showLastAttemptColumn
                        ? "grid-cols-[40px_112px_minmax(120px,1fr)_120px_minmax(100px,1fr)_120px_128px_140px_104px_150px_88px]"
                        : "grid-cols-[40px_112px_minmax(120px,1fr)_120px_minmax(100px,1fr)_120px_128px_104px_150px_88px]"
                    }`}
                    style={{
                      transform: `translateY(${vr.start}px)`,
                      height: `${vr.size}px`,
                    }}
                  >
                    <div className="flex items-center justify-center" role="gridcell">
                      {enableBulkActions ? (
                        <Checkbox
                          checked={selected.has(row.id)}
                          onCheckedChange={() => toggleRow(row.id)}
                          aria-label={`Select order ${row.customerName}`}
                        />
                      ) : null}
                    </div>
                    <div className="flex min-h-[52px] items-center truncate" role="gridcell" title={formatCreated(row.createdAt)}>
                      {formatCreated(row.createdAt)}
                    </div>
                    <div className="flex min-h-[52px] items-center truncate font-medium" role="gridcell">
                      {row.customerName}
                    </div>
                    <div className="flex min-h-[52px] items-center truncate" role="gridcell">
                      {row.customerPhone}
                    </div>
                    <div className="flex min-h-[52px] items-center truncate" role="gridcell">
                      {row.city}, {row.state}
                    </div>
                    <div className="flex min-h-[52px] items-center truncate" role="gridcell">
                      {row.trackingNumber ?? "—"}
                    </div>
                    <div className="flex min-h-[52px] items-center truncate" role="gridcell">
                      {row.assignedTo ?? "—"}
                    </div>
                    {showLastAttemptColumn ? (
                      <div className="flex min-h-[52px] items-center" role="gridcell">
                        <div className="flex flex-col gap-1">
                          <Badge variant="secondary">{row.lastAttemptOutcome ?? "NOT_CALLED"}</Badge>
                          <span className="min-h-4 text-xs text-muted-foreground">{formatAttempt(row.lastAttemptAt)}</span>
                        </div>
                      </div>
                    ) : null}
                    <div className="flex items-center" role="gridcell">
                      <Badge variant="outline">{row.currentStage}</Badge>
                    </div>
                    <div className="flex items-center" role="gridcell">
                      <OrderRowActions orderId={row.id} customerName={row.customerName} />
                    </div>
                    <div className="flex items-center" role="gridcell">
                      <OrderDetailsDrawer orderId={row.id} customerName={row.customerName} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} orders)
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} asChild>
              <Link href={pageHref(1)} aria-disabled={pagination.page <= 1}>
                First
              </Link>
            </Button>
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} asChild>
              <Link href={pageHref(Math.max(1, pagination.page - 1))} aria-disabled={pagination.page <= 1}>
                Prev
              </Link>
            </Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} asChild>
              <Link
                href={pageHref(Math.min(pagination.totalPages, pagination.page + 1))}
                aria-disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </Link>
            </Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} asChild>
              <Link href={pageHref(pagination.totalPages)} aria-disabled={pagination.page >= pagination.totalPages}>
                Last
              </Link>
            </Button>
          </div>
        </div>

        {showScrollTop ? (
          <Button
            type="button"
            size="icon"
            className="fixed right-4 bottom-20 z-30 rounded-full shadow-lg md:bottom-6"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Go to top"
          >
            <ArrowUpIcon className="size-4" />
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
