"use client";

import type { OrderDetailPayload } from "@/lib/orders/actions/order-details";
import { STOREFRONT_ORDER_SOURCE } from "@/lib/orders/source";
import {
  CallOutcomeBadge,
  OrderStatusBadge,
  ShipmentStageBadge,
} from "@/components/orders/status-badges";
import { ORDER_STATUS_BADGE_CLASS } from "@/lib/orders/status-badge-styles";
import {
  parseStorefrontOrderStatus,
  STOREFRONT_ORDER_STATUS_LABELS,
  type StorefrontOrderStatus,
} from "@/lib/orders/storefront-order-status";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type CommerceSnap = OrderDetailPayload["commerceSnapshot"];
type LineRows = OrderDetailPayload["lineItems"];

function fmt(iso: string) {
  return new Date(iso).toLocaleString();
}

function commerceStatusLabel(status: string | null): string {
  if (!status) return "—";
  const parsed = parseStorefrontOrderStatus(status);
  return STOREFRONT_ORDER_STATUS_LABELS[parsed as StorefrontOrderStatus];
}

const COMMERCE_SOURCE_LABELS: Record<string, string> = {
  UPLOAD: "Import",
  CALL_LOG: "Call",
  ADMIN: "Admin",
  BACKFILL: "Backfill",
};

function commerceSnapshotHasAny(c: CommerceSnap, lines: LineRows) {
  if (lines.length > 0) return true;
  return Object.values(c).some((v) => v != null && String(v).trim() !== "");
}

export function OrderDetailTabs({ details }: { details: OrderDetailPayload }) {
  return (
    <Tabs defaultValue="details" className="min-w-0 gap-4">
      {/* Narrow view: scroll horizontally so triggers keep readable width (avoid flex-1 squeeze). */}
      <div className="min-w-0 overflow-x-auto overscroll-x-contain">
        <TabsList className="h-auto w-max min-h-9 max-w-none flex-nowrap justify-start gap-1 bg-muted p-1 md:w-full md:max-w-full">
          <TabsTrigger
            value="details"
            className="shrink-0 flex-none px-3 text-xs sm:text-sm md:flex-1 md:min-w-0"
          >
            Details
          </TabsTrigger>
          <TabsTrigger
            value="attempts"
            className="shrink-0 flex-none px-3 text-xs sm:text-sm md:flex-1 md:min-w-0"
          >
            Calls &amp; follow-ups
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className="shrink-0 flex-none px-3 text-xs sm:text-sm md:flex-1 md:min-w-0"
          >
            Timeline
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="details" className="min-w-0 max-w-full space-y-3">
        <div className="grid min-w-0 gap-3 md:grid-cols-2">
          <p className="min-w-0 break-words text-sm">
            <span className="text-muted-foreground">Order ID:</span> {details.id}
          </p>
          <p className="min-w-0 break-words text-sm">
            <span className="text-muted-foreground">Created:</span> {fmt(details.createdAt)}
          </p>
          <p className="min-w-0 break-words text-sm">
            <span className="text-muted-foreground">Tracking:</span> {details.trackingNumber ?? "—"}
          </p>
          <p className="min-w-0 break-words text-sm">
            <span className="text-muted-foreground">Stage:</span>{" "}
            <ShipmentStageBadge stage={details.currentStage} />
          </p>
          {details.sourceSystem === STOREFRONT_ORDER_SOURCE ? (
            <p className="min-w-0 break-words text-sm">
              <span className="text-muted-foreground">Order status:</span>{" "}
              <OrderStatusBadge status={details.orderStatus} />
            </p>
          ) : null}
          <p className="min-w-0 break-words text-sm">
            <span className="text-muted-foreground">Source:</span> {details.sourceSystem}
          </p>
          <p className="min-w-0 break-words text-sm">
            <span className="text-muted-foreground">Source Order ID:</span> {details.sourceOrderId ?? "—"}
          </p>
        </div>
        <div className="min-w-0 rounded-md border p-3">
          <p className="mb-2 text-sm font-medium">Address</p>
          <address className="space-y-2 text-sm text-muted-foreground not-italic">
            <p className="break-words whitespace-pre-wrap leading-relaxed">{details.addressLine1}</p>
            {details.addressLine2 ? (
              <p className="break-words whitespace-pre-wrap leading-relaxed">{details.addressLine2}</p>
            ) : null}
            {details.addressLine3 ? (
              <p className="break-words whitespace-pre-wrap leading-relaxed">{details.addressLine3}</p>
            ) : null}
            <p className="break-words leading-relaxed">
              {[details.city, details.state].filter(Boolean).join(", ")}
              {details.postalCode ? ` ${details.postalCode}` : ""}
              {details.country ? `, ${details.country}` : ""}
            </p>
          </address>
        </div>
        {details.refinedAddress ? (
          <div className="min-w-0 rounded-md border border-dashed border-primary/35 bg-muted/30 p-3 dark:border-primary/25">
            <p className="mb-2 text-sm font-medium">Refined address (from calls)</p>
            <p className="break-words whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
              {details.refinedAddress}
            </p>
          </div>
        ) : null}

        {!commerceSnapshotHasAny(details.commerceSnapshot, details.lineItems) ? (
          <p className="text-sm text-muted-foreground">No storefront snapshot or line items stored for this order.</p>
        ) : (
          <div className="min-w-0 space-y-3 border-t pt-3">
            <p className="text-sm font-medium">Storefront snapshot</p>
            <div className="grid gap-2 md:grid-cols-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Merchant ref:</span>{" "}
                {details.commerceSnapshot.merchantOrderDisplayName ?? "—"}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Placed at:</span>{" "}
                {details.commerceSnapshot.merchantOrderCreatedAt
                  ? fmt(details.commerceSnapshot.merchantOrderCreatedAt)
                  : "—"}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Financial:</span>{" "}
                {details.commerceSnapshot.financialStatus ?? "—"}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Fulfillment:</span>{" "}
                {details.commerceSnapshot.fulfillmentStatus ?? "—"}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Payment:</span>{" "}
                {details.commerceSnapshot.paymentMethod ?? "—"}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Total:</span>{" "}
                {details.commerceSnapshot.totalAmount
                  ? `${details.commerceSnapshot.totalAmount}${details.commerceSnapshot.currencyCode ? ` ${details.commerceSnapshot.currencyCode}` : ""}`
                  : "—"}
              </p>
              <p className="text-sm md:col-span-2">
                <span className="text-muted-foreground">Notes:</span>{" "}
                {details.commerceSnapshot.merchantOrderNotes ?? "—"}
              </p>
            </div>
            {details.lineItems.length > 0 ? (
              <div className="rounded-md border p-3">
                <p className="mb-2 text-sm font-medium">Line items</p>
                <ul className="space-y-2 text-sm">
                  {details.lineItems.map((li) => (
                    <li key={li.id} className="rounded-md bg-muted/40 px-2 py-2">
                      <span className="font-medium">{li.title ?? "—"}</span>
                      {li.sku ? <span className="ml-2 text-xs text-muted-foreground">SKU {li.sku}</span> : null}
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Qty {li.quantity ?? "—"} · {li.unitPrice ?? "—"}
                        {details.commerceSnapshot.currencyCode ? ` ${details.commerceSnapshot.currencyCode}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}

        <section className="space-y-2 border-t pt-3">
          <p className="text-sm font-medium">Assignments</p>
          {details.assignmentHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assignment history.</p>
          ) : (
            details.assignmentHistory.map((a) => (
              <div key={a.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={a.isActive ? "outline" : "secondary"}>{a.isActive ? "Active" : "Inactive"}</Badge>
                  <span className="text-xs text-muted-foreground">{a.assignmentType}</span>
                  <span className="text-xs text-muted-foreground">{fmt(a.assignedAt)}</span>
                </div>
                <p className="mt-2 text-sm">
                  {a.assigneeName} assigned by {a.assignedByName}
                </p>
                {a.reason ? <p className="text-sm text-muted-foreground">{a.reason}</p> : null}
              </div>
            ))
          )}
        </section>
      </TabsContent>

      <TabsContent value="attempts" className="space-y-6">
        <section className="space-y-2">
          <p className="text-sm font-medium">Call attempts</p>
          {details.attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No call attempts yet.</p>
          ) : (
            details.attempts.map((a) => (
              <div key={a.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CallOutcomeBadge outcome={a.outcome} />
                  <span className="text-xs text-muted-foreground">{fmt(a.calledAt)}</span>
                  <span className="text-xs text-muted-foreground">by {a.callerName}</span>
                </div>
                {a.notes ? <p className="mt-2 text-sm">{a.notes}</p> : null}
              </div>
            ))
          )}
        </section>

        <section className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">Follow-ups</p>
          {details.followUps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No follow-ups yet.</p>
          ) : (
            details.followUps.map((f) => (
              <div key={f.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={f.isClosed ? "secondary" : "outline"}>{f.isClosed ? "Closed" : "Open"}</Badge>
                  <span className="text-xs text-muted-foreground">by {f.createdByName}</span>
                  <span className="text-xs text-muted-foreground">{fmt(f.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm">{f.notes}</p>
              </div>
            ))
          )}
        </section>
      </TabsContent>

      <TabsContent value="timeline" className="space-y-6">
        {details.sourceSystem === STOREFRONT_ORDER_SOURCE ? (
          <section className="space-y-2">
            <p className="text-sm font-medium">Order status history</p>
            {details.commerceStatusTimeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">No order status changes recorded yet.</p>
            ) : (
              details.commerceStatusTimeline.map((t) => (
                <div key={t.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        ORDER_STATUS_BADGE_CLASS[
                          parseStorefrontOrderStatus(t.toStatus) as StorefrontOrderStatus
                        ],
                      )}
                    >
                      {commerceStatusLabel(t.fromStatus)} → {commerceStatusLabel(t.toStatus)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {COMMERCE_SOURCE_LABELS[t.source] ?? t.source}
                    </span>
                    <span className="text-xs text-muted-foreground">{fmt(t.createdAt)}</span>
                  </div>
                  {t.changedByName ? (
                    <p className="mt-2 text-sm text-muted-foreground">by {t.changedByName}</p>
                  ) : null}
                </div>
              ))
            )}
          </section>
        ) : null}

        <section className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">Shipment stage history</p>
          {details.statusTimeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shipment status events yet.</p>
          ) : (
            details.statusTimeline.map((t) => (
              <div key={t.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <ShipmentStageBadge stage={t.stage} />
                  <span className="text-xs text-muted-foreground">{t.provider}</span>
                  <span className="text-xs text-muted-foreground">{fmt(t.eventAt)}</span>
                </div>
                <p className="mt-2 text-sm">{t.externalStatus}</p>
              </div>
            ))
          )}
        </section>
      </TabsContent>
    </Tabs>
  );
}
