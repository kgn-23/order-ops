import type { CallOutcome } from "@/lib/orders/call-outcomes";
import type { StorefrontOrderStatus } from "@/lib/orders/storefront-order-status";

/** Shared pill styles: light border + tinted background (works in light/dark). */
const tone = {
  amber:
    "border-amber-500/35 bg-amber-500/12 text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/15 dark:text-amber-100",
  emerald:
    "border-emerald-500/35 bg-emerald-500/12 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-400/15 dark:text-emerald-100",
  rose:
    "border-rose-500/35 bg-rose-500/12 text-rose-900 dark:border-rose-400/40 dark:bg-rose-400/15 dark:text-rose-100",
  slate:
    "border-slate-500/30 bg-slate-500/10 text-slate-800 dark:border-slate-400/35 dark:bg-slate-400/12 dark:text-slate-100",
  sky: "border-sky-500/35 bg-sky-500/12 text-sky-900 dark:border-sky-400/40 dark:bg-sky-400/15 dark:text-sky-100",
  blue: "border-blue-500/35 bg-blue-500/12 text-blue-900 dark:border-blue-400/40 dark:bg-blue-400/15 dark:text-blue-100",
  cyan: "border-cyan-500/35 bg-cyan-500/12 text-cyan-900 dark:border-cyan-400/40 dark:bg-cyan-400/15 dark:text-cyan-100",
  indigo:
    "border-indigo-500/35 bg-indigo-500/12 text-indigo-900 dark:border-indigo-400/40 dark:bg-indigo-400/15 dark:text-indigo-100",
  violet:
    "border-violet-500/35 bg-violet-500/12 text-violet-900 dark:border-violet-400/40 dark:bg-violet-400/15 dark:text-violet-100",
  purple:
    "border-purple-500/35 bg-purple-500/12 text-purple-900 dark:border-purple-400/40 dark:bg-purple-400/15 dark:text-purple-100",
  orange:
    "border-orange-500/35 bg-orange-500/12 text-orange-900 dark:border-orange-400/40 dark:bg-orange-400/15 dark:text-orange-100",
  teal: "border-teal-500/35 bg-teal-500/12 text-teal-900 dark:border-teal-400/40 dark:bg-teal-400/15 dark:text-teal-100",
} as const;

export const ORDER_STATUS_BADGE_CLASS: Record<StorefrontOrderStatus, string> = {
  PENDING: tone.amber,
  CONFIRMED: tone.emerald,
  CANCELLED: tone.rose,
};

export const CALL_OUTCOME_BADGE_CLASS: Record<CallOutcome, string> = {
  CALLED: tone.emerald,
  NO_ANSWER: tone.orange,
  BUSY: tone.amber,
  FAILED: tone.rose,
  INVALID_NUMBER: tone.rose,
  OTHER: tone.slate,
};

export const SHIPMENT_STAGE_LABELS: Record<string, string> = {
  BOOKED: "Booked",
  RECEIVED: "Received",
  DISPATCHED: "Dispatched",
  IN_TRANSIT: "In transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  DELIVERY_ATTEMPTED: "Delivery attempted",
  AVAILABLE_FOR_COLLECTION: "Available for collection",
  RTO: "RTO",
  OTHER: "Other",
};

export function shipmentStageLabel(stage: string | null | undefined): string {
  if (!stage) return "—";
  return SHIPMENT_STAGE_LABELS[stage] ?? stage.replace(/_/g, " ");
}

export function shipmentStageBadgeClass(stage: string | null | undefined): string {
  switch (stage) {
    case "BOOKED":
      return tone.blue;
    case "RECEIVED":
      return tone.cyan;
    case "DISPATCHED":
      return tone.indigo;
    case "IN_TRANSIT":
      return tone.violet;
    case "OUT_FOR_DELIVERY":
      return tone.purple;
    case "DELIVERED":
      return tone.emerald;
    case "DELIVERY_ATTEMPTED":
      return tone.amber;
    case "AVAILABLE_FOR_COLLECTION":
      return tone.teal;
    case "RTO":
      return tone.rose;
    default:
      return tone.slate;
  }
}

export function callOutcomeBadgeClass(outcome: string | null | undefined): string {
  if (!outcome) return tone.slate;
  if (outcome in CALL_OUTCOME_BADGE_CLASS) {
    return CALL_OUTCOME_BADGE_CLASS[outcome as CallOutcome];
  }
  return tone.slate;
}
