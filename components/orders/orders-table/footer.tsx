"use client";

import Link from "next/link";

import { ExtraQueryHiddenFields, OrdersQueryHiddenFields } from "@/components/orders/orders-table/hidden-fields";
import { PAGE_SIZE_OPTIONS } from "@/components/orders/orders-table/shared";
import type { OrdersQueryHiddenFieldsProps } from "@/components/orders/orders-table/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type OrdersTablePaginationProps = {
  page: number;
  totalPages: number;
  pageHref: (page: number) => string;
};

function OrdersTablePaginationButtons({ page, totalPages, pageHref }: OrdersTablePaginationProps) {
  return (
    <>
      <Button variant="outline" size="sm" disabled={page <= 1} asChild>
        <Link href={pageHref(1)} aria-disabled={page <= 1}>
          First
        </Link>
      </Button>
      <Button variant="outline" size="sm" disabled={page <= 1} asChild>
        <Link href={pageHref(Math.max(1, page - 1))} aria-disabled={page <= 1}>
          Prev
        </Link>
      </Button>
      <Button variant="outline" size="sm" disabled={page >= totalPages} asChild>
        <Link href={pageHref(Math.min(totalPages, page + 1))} aria-disabled={page >= totalPages}>
          Next
        </Link>
      </Button>
      <Button variant="outline" size="sm" disabled={page >= totalPages} asChild>
        <Link href={pageHref(totalPages)} aria-disabled={page >= totalPages}>
          Last
        </Link>
      </Button>
    </>
  );
}

type OrdersTableMobilePaginationProps = OrdersTablePaginationProps;

export function OrdersTableMobilePagination({ page, totalPages, pageHref }: OrdersTableMobilePaginationProps) {
  return (
    <div className="sticky top-2 z-20 rounded-lg border bg-background/95 p-2 shadow-sm backdrop-blur md:hidden">
      <div className="grid grid-cols-4 gap-2">
        <OrdersTablePaginationButtons page={page} totalPages={totalPages} pageHref={pageHref} />
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Page {page} / {totalPages}
      </p>
    </div>
  );
}

type OrdersTableFooterProps = {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  pageHref: (page: number) => string;
  hiddenQueryFields: OrdersQueryHiddenFieldsProps;
  extraQueryParams?: Record<string, string | undefined>;
};

export function OrdersTableFooter({
  pagination,
  pageHref,
  hiddenQueryFields,
  extraQueryParams,
}: OrdersTableFooterProps) {
  return (
    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} orders)
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <form
          method="get"
          className="flex items-center gap-2"
          onChange={(e) => {
            if (e.target instanceof HTMLSelectElement && e.target.name === "pageSize") {
              e.currentTarget.requestSubmit();
            }
          }}
        >
          <OrdersQueryHiddenFields {...hiddenQueryFields} page={1} exclude={["pageSize"]} />
          <ExtraQueryHiddenFields extraQueryParams={extraQueryParams} />
          <Label htmlFor="footer-pageSize" className="text-sm text-muted-foreground whitespace-nowrap">
            Rows per page
          </Label>
          <select
            id="footer-pageSize"
            name="pageSize"
            defaultValue={String(pagination.pageSize)}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <OrdersTablePaginationButtons
            page={pagination.page}
            totalPages={pagination.totalPages}
            pageHref={pageHref}
          />
        </div>
      </div>
    </div>
  );
}
