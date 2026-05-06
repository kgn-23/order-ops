import type { ReactNode } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type OrderRow = {
  id: string;
  customerName: string;
  customerPhone: string;
  city: string;
  state: string;
  trackingNumber: string | null;
  currentStage: string;
  assignedTo?: string | null;
};

type OrdersFilters = {
  searchKey: "customerName" | "customerPhone" | "trackingNumber" | "city" | "state";
  q: string;
  stage: "ALL" | "BOOKED" | "IN_TRANSIT" | "DELIVERED" | "RTO" | "OTHER";
  sortBy: "createdAt" | "currentStage" | "customerName";
  sortDir: "asc" | "desc";
};

type OrdersPagination = {
  page: number;
  pageSize: 50 | 100 | 200 | 300;
  total: number;
  totalPages: number;
};

type OrdersCounts = {
  total: number;
  assigned: number;
  unassigned: number;
  delivered: number;
  inTransit: number;
  rto: number;
};

function buildPageHref(
  page: number,
  pageSize: number,
  filters?: OrdersFilters
) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (filters) {
    params.set("searchKey", filters.searchKey);
    if (filters.q) params.set("q", filters.q);
    params.set("stage", filters.stage);
    params.set("sortBy", filters.sortBy);
    params.set("sortDir", filters.sortDir);
  }
  return `?${params.toString()}`;
}

export function OrdersTable({
  title,
  rows,
  actions,
  filters,
  pagination,
  counts,
}: {
  title: string;
  rows: OrderRow[];
  actions?: ReactNode;
  filters?: OrdersFilters;
  pagination?: OrdersPagination;
  counts?: OrdersCounts;
}) {
  const currentPage = pagination?.page ?? 1;
  const totalPages = pagination?.totalPages ?? 1;
  const pageSize = pagination?.pageSize ?? 50;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {actions ? <CardAction>{actions}</CardAction> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {counts ? (
          <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-semibold">{counts.total}</p>
            </div>
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
          </div>
        ) : null}

        {filters && pagination ? (
          <form className="grid gap-3 md:grid-cols-4 lg:grid-cols-6" method="get">
            <input type="hidden" name="page" value="1" />
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
              <label className="text-sm font-medium" htmlFor="sortBy">
                Sort by
              </label>
              <select
                id="sortBy"
                name="sortBy"
                defaultValue={filters.sortBy}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="createdAt">Created At</option>
                <option value="currentStage">Status</option>
                <option value="customerName">Customer Name</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="sortDir">
                Sort direction
              </label>
              <select
                id="sortDir"
                name="sortDir"
                defaultValue={filters.sortDir}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit">Apply</Button>
              <Link href="?page=1&pageSize=50&searchKey=customerName&stage=ALL&sortBy=createdAt&sortDir=desc">
                <Button type="button" variant="outline">
                  Reset
                </Button>
              </Link>
            </div>
          </form>
        ) : null}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Tracking</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No orders found for the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.customerName}</TableCell>
                  <TableCell>{row.customerPhone}</TableCell>
                  <TableCell>
                    {row.city}, {row.state}
                  </TableCell>
                  <TableCell>{row.trackingNumber ?? "-"}</TableCell>
                  <TableCell>{row.assignedTo ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.currentStage}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {pagination ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Showing page {currentPage} of {totalPages} ({pagination.total} orders)
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={buildPageHref(1, pageSize, filters)}
                className="rounded-md border px-3 py-1.5 text-sm"
                aria-disabled={currentPage <= 1}
              >
                First
              </Link>
              <Link
                href={buildPageHref(Math.max(1, currentPage - 1), pageSize, filters)}
                className="rounded-md border px-3 py-1.5 text-sm"
                aria-disabled={currentPage <= 1}
              >
                Prev
              </Link>
              <Link
                href={buildPageHref(Math.min(totalPages, currentPage + 1), pageSize, filters)}
                className="rounded-md border px-3 py-1.5 text-sm"
                aria-disabled={currentPage >= totalPages}
              >
                Next
              </Link>
              <Link
                href={buildPageHref(totalPages, pageSize, filters)}
                className="rounded-md border px-3 py-1.5 text-sm"
                aria-disabled={currentPage >= totalPages}
              >
                Last
              </Link>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
