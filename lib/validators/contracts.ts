import { z } from "zod";

import { CALL_OUTCOME_VALUES } from "@/lib/orders/call-outcomes";
import { STOREFRONT_ORDER_STATUS_VALUES } from "@/lib/orders/storefront-order-status";

function emptyToUndefined(v: unknown): unknown {
  return v === "" || v === undefined || v === null ? undefined : v;
}

const optionalTrimmedString = z.preprocess(
  emptyToUndefined,
  z.string().min(1).max(4000).optional(),
);

const optionalLongText = z.preprocess(
  emptyToUndefined,
  z.string().min(1).max(50000).optional(),
);

const optionalMoney = z.preprocess((v) => {
  const x = emptyToUndefined(v);
  if (x === undefined) return undefined;
  if (typeof x === "number" && Number.isFinite(x)) return x;
  const s = String(x).trim().replace(/,/g, "");
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}, z.number().optional());

const optionalLineQty = z.preprocess((v) => {
  const x = emptyToUndefined(v);
  if (x === undefined) return undefined;
  const n = typeof x === "number" ? x : Number(String(x).trim());
  if (!Number.isFinite(n)) return undefined;
  const i = Math.trunc(n);
  return i > 0 ? i : undefined;
}, z.number().int().positive().optional());

export const orderUploadRowSchema = z.object({
  externalOrderId: z.string().optional(),
  customerName: z.string().min(1),
  customerPhone: z.string().min(7),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  addressLine3: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(4),
  trackingNumber: z.string().optional(),
  merchantOrderDisplayName: optionalTrimmedString,
  merchantOrderCreatedAt: optionalTrimmedString,
  financialStatus: optionalTrimmedString,
  fulfillmentStatus: optionalTrimmedString,
  currencyCode: optionalTrimmedString,
  subtotalAmount: optionalMoney,
  shippingAmount: optionalMoney,
  taxesAmount: optionalMoney,
  totalAmount: optionalMoney,
  discountAmount: optionalMoney,
  paymentMethod: optionalTrimmedString,
  paymentReference: optionalTrimmedString,
  shippingMethodLabel: optionalTrimmedString,
  merchantOrderNotes: optionalLongText,
  orderTags: optionalTrimmedString,
  primaryVendor: optionalTrimmedString,
  orderChannel: optionalTrimmedString,
  riskLevel: optionalTrimmedString,
  lineItemTitle: optionalTrimmedString,
  lineItemSku: optionalTrimmedString,
  lineItemQuantity: optionalLineQty,
  lineItemUnitPrice: optionalMoney,
});

export const assignOrdersSchema = z.object({
  orderIds: z.array(z.string().min(1)).min(1),
  assigneeId: z.string().min(1),
  reason: z.string().optional(),
  assignmentType: z.enum(["MANUAL", "ROUND_ROBIN", "RULE_BASED"]).default("MANUAL"),
});

/** Manual stage override by admin — not carrier-synced tracking. */
export const bulkSetOrderStageSchema = z.object({
  orderIds: z.array(z.string().min(1)).min(1),
  stage: z.enum(["BOOKED", "IN_TRANSIT", "DELIVERED", "RTO", "OTHER"]),
});

const optionalTrimmedAddressLine = z.preprocess((v) => {
  if (v === undefined || v === null) return undefined;
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? undefined : s;
}, z.string().max(500).optional());

/** Structured shipping address when confirming a storefront order (COD export shape). */
export const confirmedAddressSchema = z.object({
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().min(7).max(32),
  addressLine1: z.string().min(1).max(500),
  addressLine2: optionalTrimmedAddressLine,
  addressLine3: optionalTrimmedAddressLine,
  city: z.string().min(1).max(120),
  state: z.string().min(1).max(120),
  postalCode: z.string().min(4).max(12),
});

export const logCallSchema = z.object({
  orderId: z.string().min(1),
  outcome: z.enum(CALL_OUTCOME_VALUES),
  notes: z.string().optional(),
  /** Caller-refined full address; tracking orders only (optional). */
  refinedAddress: z.preprocess((v) => {
    if (v === undefined || v === null) return undefined;
    const s = typeof v === "string" ? v.trim() : "";
    return s === "" ? undefined : s;
  }, z.string().max(8000).optional()),
  /** Updates order shipping fields when confirming a storefront order. */
  confirmedAddress: confirmedAddressSchema.optional(),
  /** Storefront order confirmation status (caller sheet only). */
  orderStatus: z.enum(STOREFRONT_ORDER_STATUS_VALUES).optional(),
  callDurationS: z.number().int().nonnegative().optional(),
});

export const followUpSchema = z.object({
  orderId: z.string().min(1),
  notes: z.string().min(1),
  dueAt: z.string().datetime().optional(),
});

export const exportCodOrdersSchema = z.object({
  orderIds: z.array(z.string().min(1)).optional(),
});

export const trackingSyncSchema = z.object({
  orderId: z.string().min(1),
  provider: z.string().default("INDIA_POST"),
  externalStatus: z.string().min(1),
  idempotencyKey: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

/** India Post API sync: order only (status comes from carrier). */
export const indiaPostTrackingSyncSchema = z.object({
  orderId: z.string().min(1),
});

export const addressValidationSchema = z.object({
  orderId: z.string().min(1),
  suggestedAddress: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  remarks: z.string().optional(),
});

const optionalPhone = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : v),
  z.string().min(7).max(32).optional(),
);

export const teamOperationalRoleSchema = z.enum(["MANAGER", "CALLER"]);

export const createTeamUserSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(255),
  phone: optionalPhone,
  role: teamOperationalRoleSchema,
  callerTeamId: z.string().min(1).optional(),
  /** Initial password chosen by admin; share securely with the new user so they can sign in. */
  initialPassword: z.string().min(8).max(128),
});

export const updateTeamUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(120),
  email: z.string().email().max(255),
  phone: optionalPhone,
  isActive: z.boolean(),
  role: teamOperationalRoleSchema,
  callerTeamId: z.string().min(1).optional(),
  /** When set, replaces the user's password (admin reset). Omit to leave unchanged. */
  newPassword: z.string().min(8).max(128).optional(),
});

export const createCallerTeamSchema = z.object({
  name: z.string().min(1).max(120),
  leaderUserId: z.string().min(1),
});
