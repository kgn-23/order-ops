import { z } from "zod";

export const orderUploadRowSchema = z.object({
  externalOrderId: z.string().optional(),
  customerName: z.string().min(1),
  customerPhone: z.string().min(7),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(4),
  trackingNumber: z.string().optional(),
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

export const logCallSchema = z.object({
  orderId: z.string().min(1),
  outcome: z.enum([
    "NO_ANSWER",
    "CALLBACK_REQUESTED",
    "CONFIRMED",
    "DELAYED",
    "CANCELLED",
    "INVALID_NUMBER",
    "OTHER",
  ]),
  notes: z.string().optional(),
  callDurationS: z.number().int().nonnegative().optional(),
});

export const followUpSchema = z.object({
  orderId: z.string().min(1),
  notes: z.string().min(1),
  dueAt: z.string().datetime().optional(),
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
});

export const updateTeamUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(120),
  email: z.string().email().max(255),
  phone: optionalPhone,
  isActive: z.boolean(),
  role: teamOperationalRoleSchema,
  callerTeamId: z.string().min(1).optional(),
});

export const createCallerTeamSchema = z.object({
  name: z.string().min(1).max(120),
  leaderUserId: z.string().min(1),
});
