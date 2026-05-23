import { STOREFRONT_ORDER_SOURCE } from "@/lib/orders/source";

/** Which admin orders list opened the bulk upload sheet. */
export type BulkUploadListContext = "tracking" | "storefront";

export function parseBulkUploadListContext(
  value: string | null | undefined,
): BulkUploadListContext | null {
  const v = value?.trim().toLowerCase();
  if (v === "tracking" || v === "storefront") return v;
  return null;
}

export function orderSourceForBulkUploadListContext(
  listContext: BulkUploadListContext,
): typeof STOREFRONT_ORDER_SOURCE | "MANUAL" {
  return listContext === "storefront" ? STOREFRONT_ORDER_SOURCE : "MANUAL";
}

/** Fields populated by storefront / commerce exports (Shopify-style sheets). */
export type OrderUploadSourceDetectInput = {
  financialStatus?: string | null;
  fulfillmentStatus?: string | null;
  merchantOrderDisplayName?: string | null;
  merchantOrderCreatedAt?: string | null;
  currencyCode?: string | null;
  subtotalAmount?: number | null;
  shippingAmount?: number | null;
  taxesAmount?: number | null;
  totalAmount?: number | null;
  discountAmount?: number | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  shippingMethodLabel?: string | null;
  merchantOrderNotes?: string | null;
  orderTags?: string | null;
  primaryVendor?: string | null;
  orderChannel?: string | null;
  riskLevel?: string | null;
  lineItemTitle?: string | null;
  lineItemSku?: string | null;
  lineItemQuantity?: number | null;
  lineItemUnitPrice?: number | null;
};

function hasText(value?: string | null): boolean {
  return Boolean(value?.trim());
}

function hasMoney(value?: number | null): boolean {
  return value != null && Number.isFinite(value);
}

/**
 * Classify an upload row as carrier/manual vs storefront export from column content.
 * Carrier sheets (tracking / India Post) stay MANUAL; commerce exports become STOREFRONT.
 */
export function detectOrderSourceFromUploadRow(
  row: OrderUploadSourceDetectInput,
): typeof STOREFRONT_ORDER_SOURCE | "MANUAL" {
  const hasCommerceStatus = hasText(row.financialStatus) || hasText(row.fulfillmentStatus);
  const hasLineItem =
    hasText(row.lineItemTitle) ||
    hasText(row.lineItemSku) ||
    hasMoney(row.lineItemQuantity) ||
    hasMoney(row.lineItemUnitPrice);
  const hasCommerceMoney =
    hasMoney(row.totalAmount) ||
    hasMoney(row.subtotalAmount) ||
    hasMoney(row.shippingAmount) ||
    hasMoney(row.taxesAmount) ||
    hasMoney(row.discountAmount);
  const hasCommerceMeta =
    hasText(row.currencyCode) ||
    hasText(row.paymentMethod) ||
    hasText(row.paymentReference) ||
    hasText(row.primaryVendor) ||
    hasText(row.orderChannel) ||
    hasText(row.riskLevel) ||
    hasText(row.orderTags) ||
    hasText(row.merchantOrderNotes) ||
    hasText(row.shippingMethodLabel) ||
    hasText(row.merchantOrderCreatedAt);

  if (
    hasCommerceStatus ||
    hasLineItem ||
    (hasCommerceMoney && hasText(row.merchantOrderDisplayName)) ||
    (hasCommerceMeta && (hasCommerceMoney || hasText(row.merchantOrderDisplayName)))
  ) {
    return STOREFRONT_ORDER_SOURCE;
  }

  return "MANUAL";
}

export function resolveOrderSourceForUpload(
  row: OrderUploadSourceDetectInput,
  listContext: BulkUploadListContext | null,
): typeof STOREFRONT_ORDER_SOURCE | "MANUAL" {
  if (listContext) {
    return orderSourceForBulkUploadListContext(listContext);
  }
  return detectOrderSourceFromUploadRow(row);
}
