import type { OrderStatus } from "@/app/generated/prisma/client";

export const STOREFRONT_ORDER_STATUS_VALUES = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
] as const satisfies readonly OrderStatus[];

export type StorefrontOrderStatus = (typeof STOREFRONT_ORDER_STATUS_VALUES)[number];

export const STOREFRONT_ORDER_STATUS_LABELS: Record<StorefrontOrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

export function isStorefrontOrderConfirmed(
  status: string | null | undefined,
): boolean {
  return status === "CONFIRMED";
}

export function parseStorefrontOrderStatus(
  raw: string | null | undefined,
): StorefrontOrderStatus {
  if (raw === "CONFIRMED" || raw === "CANCELLED") return raw;
  return "PENDING";
}
