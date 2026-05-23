import type { Decimal } from "@prisma/client/runtime/client";

import { CALL_OUTCOME_LABELS, type CallOutcome } from "@/lib/orders/call-outcomes";

/** Short payment label for table cells (e.g. Cash on Delivery → COD). */
export function formatPaymentMethodDisplay(raw: string | null | undefined): string {
  if (!raw?.trim()) return "—";
  const normalized = raw.trim();
  if (/cash\s*on\s*delivery/i.test(normalized) || /^cod$/i.test(normalized)) {
    return "COD";
  }
  return normalized;
}

export function formatLastCallOutcomeLabel(outcome: string | null | undefined): string {
  if (!outcome) return "Not called";
  if (outcome in CALL_OUTCOME_LABELS) {
    return CALL_OUTCOME_LABELS[outcome as CallOutcome];
  }
  return outcome.replace(/_/g, " ");
}

export function formatTotalAmountDisplay(
  total: Decimal | null | undefined,
  currencyCode: string | null | undefined,
): string | null {
  if (total == null) return null;
  const currency = currencyCode?.trim() || "INR";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(total));
  } catch {
    return `${currency} ${Number(total).toFixed(2)}`;
  }
}
