import type { CommerceStatusChangeSource, OrderStatus, Prisma } from "@/app/generated/prisma/client";

export type RecordCommerceStatusChangeInput = {
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedById?: string;
  source: CommerceStatusChangeSource;
  callLogId?: string;
  notes?: string;
};

/** Append commerce status history and sync `Order.orderStatus`. No-op when status unchanged. */
export async function recordCommerceStatusChange(
  tx: Prisma.TransactionClient,
  input: RecordCommerceStatusChangeInput,
): Promise<boolean> {
  if (input.fromStatus === input.toStatus) {
    return false;
  }

  await tx.orderCommerceStatusEvent.create({
    data: {
      orderId: input.orderId,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      changedById: input.changedById,
      source: input.source,
      callLogId: input.callLogId,
      notes: input.notes,
    },
  });

  await tx.order.update({
    where: { id: input.orderId },
    data: { orderStatus: input.toStatus },
  });

  return true;
}
