"use client";

import Link from "next/link";
import type { RefObject } from "react";
import type { Virtualizer } from "@tanstack/react-virtual";

import { OrderDetailsDrawer } from "@/components/orders/order-details-drawer";
import { OrderRowActions } from "@/components/orders/order-row-actions";
import {
  ariaSortForColumn,
  formatAssignedToWithAttempts,
  formatAttempt,
  formatCreated,
  toTelHref,
} from "@/components/orders/orders-table/shared";
import { formatPaymentMethodDisplay } from "@/lib/orders/format";
import type { OrdersTableFilters } from "@/components/orders/orders-table/shared";
import type { OrdersPageRow, OrdersSortBy } from "@/lib/orders/types";
import {
  CallOutcomeBadge,
  OrderStatusBadge,
  ShipmentStageBadge,
} from "@/components/orders/status-badges";
import { Checkbox } from "@/components/ui/checkbox";

type OrdersTableDesktopGridProps = {
  scrollRef: RefObject<HTMLDivElement | null>;
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  desktopGridTemplate: string;
  rows: OrdersPageRow[];
  filters: OrdersTableFilters;
  sortLink: (column: OrdersSortBy) => string;
  showBulkCheckboxes: boolean;
  enableCallerOrderActions: boolean;
  showCommerceColumns: boolean;
  showProductColumn: boolean;
  showTrackingColumn: boolean;
  showLastAttemptColumn: boolean;
  showOrderStatusColumn: boolean;
  showShipmentStageColumn: boolean;
  selected: Set<string>;
  headerCheckboxState: boolean | "indeterminate";
  onToggleAll: () => void;
  onToggleRow: (id: string) => void;
};

export function OrdersTableDesktopGrid({
  scrollRef,
  rowVirtualizer,
  desktopGridTemplate,
  rows,
  filters,
  sortLink,
  showBulkCheckboxes,
  enableCallerOrderActions,
  showCommerceColumns,
  showProductColumn,
  showTrackingColumn,
  showLastAttemptColumn,
  showOrderStatusColumn,
  showShipmentStageColumn,
  selected,
  headerCheckboxState,
  onToggleAll,
  onToggleRow,
}: OrdersTableDesktopGridProps) {
  const virtualRows = rowVirtualizer.getVirtualItems();

  return (
    <div
      ref={scrollRef}
      className="orders-data-grid-scroll hidden max-h-[min(70vh,780px)] min-w-0 overflow-auto rounded-md border md:block"
      role="grid"
      aria-label="Orders list"
    >
      <div
        className="sticky top-0 z-20 grid gap-2 border-b bg-background/95 px-2 py-2 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 sm:text-sm"
        style={{ gridTemplateColumns: desktopGridTemplate }}
        role="row"
      >
        {showBulkCheckboxes ? (
          <div className="flex items-center justify-center" role="columnheader">
            <Checkbox
              checked={headerCheckboxState}
              onCheckedChange={onToggleAll}
              aria-label="Select all rows on this page"
            />
          </div>
        ) : null}
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
        {showCommerceColumns ? (
          <>
            <div role="columnheader">Merchant #</div>
            <div role="columnheader">Total</div>
            {showProductColumn ? <div role="columnheader">Product</div> : null}
          </>
        ) : null}
        {showTrackingColumn ? <div role="columnheader">Tracking</div> : null}
        <div role="columnheader">Assigned</div>
        {showOrderStatusColumn ? <div role="columnheader">Order status</div> : null}
        {showShipmentStageColumn ? (
          <div role="columnheader">
            <Link
              href={sortLink("currentStage")}
              className="text-foreground underline-offset-4 hover:underline"
              aria-sort={ariaSortForColumn("currentStage", filters)}
            >
              Stage
            </Link>
          </div>
        ) : null}
        {enableCallerOrderActions ? <div role="columnheader">Actions</div> : null}
        <div className="flex items-center justify-end" role="columnheader">
          <span className="sr-only">View order</span>
        </div>
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
                className="group/row absolute left-0 grid w-full gap-2 border-b px-2 py-2"
                style={{
                  gridTemplateColumns: desktopGridTemplate,
                  transform: `translateY(${vr.start}px)`,
                  height: `${vr.size}px`,
                }}
              >
                {showBulkCheckboxes ? (
                  <div className="flex items-center justify-center" role="gridcell">
                    <Checkbox
                      checked={selected.has(row.id)}
                      onCheckedChange={() => onToggleRow(row.id)}
                      aria-label={`Select order ${row.customerName}`}
                    />
                  </div>
                ) : null}
                <div className="flex min-h-[52px] items-center truncate" role="gridcell" title={formatCreated(row.createdAt)}>
                  {formatCreated(row.createdAt)}
                </div>
                <div className="flex min-h-[52px] items-center truncate font-medium" role="gridcell" title={row.customerName}>
                  {row.customerName}
                </div>
                <div className="flex min-h-[52px] items-center truncate" role="gridcell" title={row.customerPhone}>
                  <a
                    href={toTelHref(row.customerPhone)}
                    className="truncate text-primary underline-offset-2 hover:underline"
                  >
                    {row.customerPhone}
                  </a>
                </div>
                {showCommerceColumns ? (
                  <>
                    <div className="flex min-h-[52px] items-center truncate text-xs" role="gridcell" title={row.merchantOrderDisplayName ?? ""}>
                      {row.merchantOrderDisplayName ?? "—"}
                    </div>
                    <div className="flex min-h-[52px] flex-col justify-center gap-0.5 text-xs" role="gridcell">
                      <span className="truncate font-medium">{row.totalAmountDisplay ?? "—"}</span>
                      <span className="truncate text-muted-foreground">
                        {formatPaymentMethodDisplay(row.paymentMethod)}
                      </span>
                    </div>
                    {showProductColumn ? (
                      <div className="flex min-h-[52px] items-center truncate text-xs" role="gridcell" title={row.primaryLineTitle ?? ""}>
                        {row.primaryLineTitle
                          ? `${row.primaryLineTitle.slice(0, 48)}${row.primaryLineTitle.length > 48 ? "…" : ""}`
                          : "—"}
                      </div>
                    ) : null}
                  </>
                ) : null}
                {showTrackingColumn ? (
                  <div className="flex min-h-[52px] items-center truncate" role="gridcell">
                    {row.trackingNumber ?? "—"}
                  </div>
                ) : null}
                <div
                  className="flex min-h-[52px] flex-col justify-center gap-1"
                  role="gridcell"
                  title={`${row.attemptCount} call${row.attemptCount === 1 ? "" : "s"} logged`}
                >
                  <span className="truncate font-medium">
                    {formatAssignedToWithAttempts(row.assignedTo, row.attemptCount)}
                  </span>
                  {showLastAttemptColumn ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <CallOutcomeBadge outcome={row.lastAttemptOutcome} size="compact" />
                      {row.lastAttemptAt ? (
                        <span className="text-[10px] text-muted-foreground">
                          {formatAttempt(row.lastAttemptAt)}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {showOrderStatusColumn ? (
                  <div className="flex items-center" role="gridcell">
                    <OrderStatusBadge status={row.orderStatus} />
                  </div>
                ) : null}
                {showShipmentStageColumn ? (
                  <div className="flex items-center" role="gridcell">
                    <ShipmentStageBadge stage={row.currentStage} />
                  </div>
                ) : null}
                {enableCallerOrderActions ? (
                  <div className="flex items-center" role="gridcell">
                    <OrderRowActions
                      orderId={row.id}
                      customerName={row.customerName}
                      customerPhone={row.customerPhone}
                      isStorefront={showCommerceColumns}
                      orderStatus={row.orderStatus}
                    />
                  </div>
                ) : null}
                <div className="flex items-center justify-center md:justify-end" role="gridcell">
                  <OrderDetailsDrawer
                    orderId={row.id}
                    customerName={row.customerName}
                    triggerVariant="icon"
                    triggerClassName="opacity-70 hover:opacity-100 md:opacity-0 md:transition-opacity md:group-hover/row:opacity-100 md:focus-visible:opacity-100"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
