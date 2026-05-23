import { Badge } from "@/components/ui/badge";
import { formatLastCallOutcomeLabel } from "@/lib/orders/format";
import {
  callOutcomeBadgeClass,
  ORDER_STATUS_BADGE_CLASS,
  shipmentStageBadgeClass,
  shipmentStageLabel,
} from "@/lib/orders/status-badge-styles";
import {
  parseStorefrontOrderStatus,
  STOREFRONT_ORDER_STATUS_LABELS,
} from "@/lib/orders/storefront-order-status";
import { cn } from "@/lib/utils";

type BadgeSize = "default" | "compact";

const sizeClass: Record<BadgeSize, string> = {
  default: "",
  compact: "text-[10px] px-1.5",
};

export function OrderStatusBadge({
  status,
  className,
  size = "default",
}: {
  status: string | null | undefined;
  className?: string;
  size?: BadgeSize;
}) {
  const parsed = parseStorefrontOrderStatus(status);
  return (
    <Badge
      variant="outline"
      className={cn(ORDER_STATUS_BADGE_CLASS[parsed], sizeClass[size], className)}
    >
      {STOREFRONT_ORDER_STATUS_LABELS[parsed]}
    </Badge>
  );
}

export function CallOutcomeBadge({
  outcome,
  className,
  size = "default",
}: {
  outcome: string | null | undefined;
  className?: string;
  size?: BadgeSize;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(callOutcomeBadgeClass(outcome), sizeClass[size], className)}
    >
      {formatLastCallOutcomeLabel(outcome)}
    </Badge>
  );
}

export function ShipmentStageBadge({
  stage,
  className,
  size = "default",
}: {
  stage: string | null | undefined;
  className?: string;
  size?: BadgeSize;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(shipmentStageBadgeClass(stage), sizeClass[size], className)}
    >
      {shipmentStageLabel(stage)}
    </Badge>
  );
}
