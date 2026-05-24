import type { OrderShipmentStage } from "@/app/generated/prisma/client";

import { SHIPMENT_STAGE_LABELS } from "@/lib/orders/status-badge-styles";

/** Matches `OrderShipmentStage` in Prisma. */
export const ORDER_SHIPMENT_STAGE_VALUES = [
  "BOOKED",
  "RECEIVED",
  "DISPATCHED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DELIVERY_ATTEMPTED",
  "AVAILABLE_FOR_COLLECTION",
  "RTO",
  "OTHER",
] as const satisfies readonly OrderShipmentStage[];

export type OrderShipmentStageValue = (typeof ORDER_SHIPMENT_STAGE_VALUES)[number];

export function shipmentStageSelectLabel(stage: OrderShipmentStageValue): string {
  return SHIPMENT_STAGE_LABELS[stage] ?? stage.replace(/_/g, " ");
}

const stageEnumTuple = ORDER_SHIPMENT_STAGE_VALUES as unknown as [
  OrderShipmentStageValue,
  ...OrderShipmentStageValue[],
];

export const orderShipmentStageZodEnum = stageEnumTuple;
