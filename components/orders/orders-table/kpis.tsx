"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { OrdersTableCounts } from "@/components/orders/orders-table/shared";

type OrdersTableKpisProps = {
  counts: OrdersTableCounts;
  filterSummaryKpis?: boolean;
};

export function OrdersTableKpis({ counts, filterSummaryKpis = false }: OrdersTableKpisProps) {
  const [showAllKpis, setShowAllKpis] = useState(false);
  const [showMobileKpis, setShowMobileKpis] = useState(false);

  return (
    <div className="space-y-2">
      {!filterSummaryKpis ? (
        <div className="flex items-center gap-2 md:hidden">
          <Button type="button" variant="outline" size="sm" onClick={() => setShowMobileKpis((prev) => !prev)}>
            {showMobileKpis ? "Hide KPIs" : "Show KPIs"}
          </Button>
        </div>
      ) : null}
      {filterSummaryKpis ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            KPIs match search and filters (stage, call status, follow-up, and optional order-created dates in
            IST).
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Total orders</p>
              <p className="text-lg font-semibold tabular-nums">{counts.total}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Has been called</p>
              <p className="text-lg font-semibold tabular-nums">{counts.calledOrders}</p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                At least one call log on record
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Never called</p>
              <p className="text-lg font-semibold tabular-nums">{counts.notCalledOrders}</p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">No call logs yet</p>
            </div>
          </div>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
