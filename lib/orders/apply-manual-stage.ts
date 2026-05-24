import type { OrderShipmentStage, Prisma } from "@/app/generated/prisma/client";
import { STOREFRONT_ORDER_SOURCE } from "@/lib/orders/source";

export async function applyManualOrderStage(
  tx: Prisma.TransactionClient,
  input: {
    orderId: string;
    stage: OrderShipmentStage;
  },
): Promise<{ changed: boolean; previousStage: OrderShipmentStage | null }> {
  const order = await tx.order.findFirst({
    where: { id: input.orderId, deletedAt: null },
    select: { currentStage: true, sourceSystem: true },
  });
  if (!order) {
    throw new Error("Order not found.");
  }
  if (order.sourceSystem === STOREFRONT_ORDER_SOURCE) {
    throw new Error("Shipment stage applies to tracking orders only.");
  }
  if (order.currentStage === input.stage) {
    return { changed: false, previousStage: order.currentStage };
  }

  await tx.order.update({
    where: { id: input.orderId },
    data: {
      previousStage: order.currentStage,
      currentStage: input.stage,
    },
  });

  await tx.orderStatusEvent.create({
    data: {
      orderId: input.orderId,
      stage: input.stage,
      provider: "MANUAL",
      externalStatus: input.stage,
    },
  });

  return { changed: true, previousStage: order.currentStage };
}
