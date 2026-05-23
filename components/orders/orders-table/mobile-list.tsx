"use client";

import { PhoneIcon } from "lucide-react";

import type { OrdersOptionalColumns } from "@/components/orders/orders-column-preferences";
import { OrderDetailsDrawer } from "@/components/orders/order-details-drawer";
import { OrderRowActions } from "@/components/orders/order-row-actions";
import {
  formatAssignedToWithAttempts,
  formatAttempt,
  formatCreated,
  toTelHref,
} from "@/components/orders/orders-table/shared";
import { formatPaymentMethodDisplay } from "@/lib/orders/format";
import type { OrdersPageRow } from "@/lib/orders/types";
import {
  CallOutcomeBadge,
  OrderStatusBadge,
} from "@/components/orders/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type OrdersTableMobileListProps = {
  rows: OrdersPageRow[];
  showBulkCheckboxes: boolean;
  enableCallerOrderActions: boolean;
  showCommerceColumns: boolean;
  showLastAttemptColumn: boolean;
  showOrderStatusColumn: boolean;
  visibleOptionalCols: OrdersOptionalColumns;
  selected: Set<string>;
  onToggleRow: (id: string) => void;
};

export function OrdersTableMobileList({
  rows,
  showBulkCheckboxes,
  enableCallerOrderActions,
  showCommerceColumns,
  showLastAttemptColumn,
  showOrderStatusColumn,
  visibleOptionalCols,
  selected,
  onToggleRow,
}: OrdersTableMobileListProps) {
  return (
    <div className="flex flex-col gap-3 md:hidden">
      {rows.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">No orders found for the selected filters.</p>
      ) : (
        rows.map((row) => (
          <div key={row.id} className="rounded-xl border bg-card p-3 shadow-sm">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {showBulkCheckboxes ? (
                  <Checkbox
                    checked={selected.has(row.id)}
                    onCheckedChange={() => onToggleRow(row.id)}
                    aria-label={`Select order ${row.customerName}`}
                  />
                ) : null}
                <p className="text-sm font-semibold text-primary">#{row.id.slice(-5).toUpperCase()}</p>
              </div>
              {showOrderStatusColumn || (!showCommerceColumns && visibleOptionalCols.tracking) ? (
                <div className="flex items-center gap-1.5">
                  {showOrderStatusColumn ? <OrderStatusBadge status={row.orderStatus} /> : null}
                  {!showCommerceColumns && visibleOptionalCols.tracking ? (
                    <Badge variant="secondary">{row.trackingNumber ? "TRACKED" : "NO TRACKING"}</Badge>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mb-2">
              <p className="text-lg font-semibold leading-tight">{row.customerName}</p>
              <p className="text-sm text-muted-foreground">{row.customerPhone}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatCreated(row.createdAt)}</p>
            </div>

            {showCommerceColumns ? (
              <div className="mb-2 space-y-1 rounded-md border border-dashed p-2 text-xs">
                <p className="truncate">
                  <span className="text-muted-foreground">Merchant ref:</span>{" "}
                  <span className="font-medium">{row.merchantOrderDisplayName ?? "—"}</span>
                </p>
                <p className="truncate">
                  <span className="text-muted-foreground">Total:</span>{" "}
                  <span className="font-medium">{row.totalAmountDisplay ?? "—"}</span>
                  {row.financialStatus ? (
                    <Badge variant="outline" className="ml-2">
                      {row.financialStatus}
                    </Badge>
                  ) : null}
                </p>
                <p className="truncate text-muted-foreground">
                  {formatPaymentMethodDisplay(row.paymentMethod)}
                  {visibleOptionalCols.product ? <> · Line: {row.primaryLineTitle ?? "—"}</> : null}
                </p>
              </div>
            ) : null}

            <div className="mb-2 rounded-md border border-dashed p-2 text-xs text-muted-foreground">
              <p>
                Assigned:{" "}
                <span className="font-medium text-foreground">
                  {formatAssignedToWithAttempts(row.assignedTo, row.attemptCount)}
                </span>
              </p>
              {showLastAttemptColumn ? (
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>Last call:</span>
                  <CallOutcomeBadge outcome={row.lastAttemptOutcome} size="compact" />
                  {row.lastAttemptAt ? (
                    <span className="text-[10px]">{formatAttempt(row.lastAttemptAt)}</span>
                  ) : null}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Button asChild className="bg-green-600 text-white hover:bg-green-700">
                <a href={toTelHref(row.customerPhone)}>
                  <PhoneIcon className="mr-1 size-4" />
                  Call
                </a>
              </Button>
              {enableCallerOrderActions ? (
                <OrderRowActions
                  orderId={row.id}
                  customerName={row.customerName}
                  customerPhone={row.customerPhone}
                  isStorefront={showCommerceColumns}
                  orderStatus={row.orderStatus}
                />
              ) : null}
              <div className="ml-auto shrink-0">
                <OrderDetailsDrawer orderId={row.id} customerName={row.customerName} triggerVariant="icon" />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
