import { revalidatePath } from "next/cache";
import type { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function mapStage(externalStatus: string) {
  const normalized = externalStatus.toUpperCase();
  if (normalized.includes("DELIVER")) return "DELIVERED";
  if (normalized.includes("RTO")) return "RTO";
  if (normalized.includes("TRANSIT")) return "IN_TRANSIT";
  if (normalized.includes("BOOK")) return "BOOKED";
  return "OTHER";
}

export function revalidateOrderListViews() {
  revalidatePath("/");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/commerce");
  revalidatePath("/manager/orders");
  revalidatePath("/manager/orders/commerce");
  revalidatePath("/caller/orders");
  revalidatePath("/caller/orders/commerce");
}

export function parseMerchantOrderCreatedAt(raw: string | undefined): Date | undefined {
  if (!raw?.trim()) return undefined;
  const d = new Date(raw.trim());
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function logActivity(input: {
  actorUserId?: string;
  orderId?: string;
  entityType: string;
  entityId: string;
  action: string;
  details?: Record<string, unknown>;
}) {
  const { actorUserId, orderId, details, ...rest } = input;

  await db.activityLog.create({
    data: {
      ...rest,
      details: details as Prisma.InputJsonValue | undefined,
      actor: actorUserId ? { connect: { id: actorUserId } } : undefined,
      order: orderId ? { connect: { id: orderId } } : undefined,
    },
  });
}
