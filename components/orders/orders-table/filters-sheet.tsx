"use client";

import Link from "next/link";
import { FilterIcon } from "lucide-react";

import { ExtraQueryHiddenFields, OrdersQueryHiddenFields } from "@/components/orders/orders-table/hidden-fields";
import type { OrdersQueryHiddenFieldsProps, OrdersTableFilters } from "@/components/orders/orders-table/shared";
import { CALL_OUTCOME_LABELS, CALL_OUTCOME_VALUES } from "@/lib/orders/call-outcomes";
import {
  STOREFRONT_ORDER_STATUS_LABELS,
  STOREFRONT_ORDER_STATUS_VALUES,
} from "@/lib/orders/storefront-order-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type OrdersTableFiltersSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hiddenQueryFields: OrdersQueryHiddenFieldsProps;
  extraQueryParams?: Record<string, string | undefined>;
  filters: OrdersTableFilters;
  resetFiltersHref: string;
  secondaryFiltersActive: boolean;
  showCommerceColumns?: boolean;
};

export function OrdersTableFiltersSheet({
  open,
  onOpenChange,
  hiddenQueryFields,
  extraQueryParams,
  filters,
  resetFiltersHref,
  secondaryFiltersActive,
  showCommerceColumns = false,
}: OrdersTableFiltersSheetProps) {
  const hiddenExclude = showCommerceColumns
    ? ([
        "stage",
        "orderStatusFilter",
        "exportFilter",
        "attemptFilter",
        "followUpFilter",
        "createdFrom",
        "createdTo",
      ] as const)
    : (["stage", "attemptFilter", "followUpFilter", "createdFrom", "createdTo"] as const);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" className="shrink-0" aria-label="Open filters">
          <FilterIcon className="mr-2 size-4" />
          Filters
          {secondaryFiltersActive ? (
            <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-[10px]">
              On
            </Badge>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            {showCommerceColumns
              ? "Order status, last call outcome, follow-up, and created date. Search stays on the main page."
              : "Shipment stage, last call outcome, follow-up, and created date. Search stays on the main page."}
          </SheetDescription>
        </SheetHeader>
        <form
          method="get"
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-8 pt-4"
          onSubmit={() => onOpenChange(false)}
        >
          <OrdersQueryHiddenFields {...hiddenQueryFields} exclude={[...hiddenExclude]} />
          <ExtraQueryHiddenFields extraQueryParams={extraQueryParams} />

          {showCommerceColumns ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sheet-orderStatusFilter">Order status</Label>
              <select
                id="sheet-orderStatusFilter"
                name="orderStatusFilter"
                defaultValue={filters.orderStatusFilter}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="ALL">All</option>
                {STOREFRONT_ORDER_STATUS_VALUES.map((status) => (
                  <option key={status} value={status}>
                    {STOREFRONT_ORDER_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sheet-stage">Stage</Label>
              <select
                id="sheet-stage"
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
          )}

          {showCommerceColumns ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sheet-exportFilter">Export status</Label>
              <select
                id="sheet-exportFilter"
                name="exportFilter"
                defaultValue={filters.exportFilter}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="ALL">All</option>
                <option value="READY">Ready to export</option>
                <option value="EXPORTED">Already exported</option>
              </select>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sheet-attemptFilter">Last call outcome</Label>
            <select
              id="sheet-attemptFilter"
              name="attemptFilter"
              defaultValue={filters.attemptFilter}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="ALL">All</option>
              <option value="NOT_CALLED">Not called</option>
              {CALL_OUTCOME_VALUES.map((outcome) => (
                <option key={outcome} value={outcome}>
                  {CALL_OUTCOME_LABELS[outcome]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sheet-followUpFilter">Follow-up</Label>
            <select
              id="sheet-followUpFilter"
              name="followUpFilter"
              defaultValue={filters.followUpFilter}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="ALL">All</option>
              <option value="WITH_FOLLOW_UP">With follow-up</option>
              <option value="WITHOUT_FOLLOW_UP">Without follow-up</option>
            </select>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">Order created (IST)</span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground" htmlFor="sheet-createdFrom">
                  From
                </Label>
                <Input
                  id="sheet-createdFrom"
                  name="createdFrom"
                  type="date"
                  defaultValue={filters.createdFrom ?? ""}
                  className="h-9"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground" htmlFor="sheet-createdTo">
                  To
                </Label>
                <Input
                  id="sheet-createdTo"
                  name="createdTo"
                  type="date"
                  defaultValue={filters.createdTo ?? ""}
                  className="h-9"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Inclusive calendar days in Asia/Kolkata on <span className="font-medium">created at</span>.
            </p>
          </div>
          <div className="mt-auto flex flex-wrap gap-2 border-t pt-4">
            <Button type="submit">Apply filters</Button>
            <Button type="button" variant="outline" asChild>
              <Link href={resetFiltersHref} onClick={() => onOpenChange(false)}>
                Clear filters
              </Link>
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
