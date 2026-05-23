import type { CallOutcome } from "@/lib/orders/call-outcomes";
import type { StorefrontOrderStatus } from "@/lib/orders/storefront-order-status";

export type OrdersSearchKey =
  | "customerName"
  | "customerPhone"
  | "trackingNumber"
  | "city"
  | "state"
  | "merchantOrderDisplayName";

export type OrdersStageFilter =
  | "ALL"
  | "BOOKED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "RTO"
  | "OTHER";

export type OrdersSortBy = "createdAt" | "currentStage" | "customerName";
export type OrdersSortDir = "asc" | "desc";

export type OrdersAttemptFilter = "ALL" | "NOT_CALLED" | CallOutcome;
export type OrdersOrderStatusFilter = "ALL" | StorefrontOrderStatus;
export type OrdersExportFilter = "ALL" | "READY" | "EXPORTED";
export type OrdersFollowUpFilter = "ALL" | "WITH_FOLLOW_UP" | "WITHOUT_FOLLOW_UP";

export type OrdersPageRow = {
  id: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  city: string;
  state: string;
  trackingNumber: string | null;
  currentStage: string;
  assignedTo: string | null;
  attemptCount: number;
  lastAttemptOutcome?: string | null;
  lastAttemptAt?: string | null;
  /** Storefront confirmation status (PENDING | CONFIRMED | CANCELLED). */
  orderStatus?: string | null;
  merchantOrderDisplayName?: string | null;
  totalAmountDisplay?: string | null;
  financialStatus?: string | null;
  paymentMethod?: string | null;
  primaryLineTitle?: string | null;
};

export type OrdersPageResult = {
  rows: OrdersPageRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts: {
    total: number;
    assigned: number;
    unassigned: number;
    delivered: number;
    inTransit: number;
    rto: number;
    calledOrders: number;
    notCalledOrders: number;
    withFollowUpOrders: number;
    withoutFollowUpOrders: number;
    totalFollowUps: number;
  };
};

export type OrdersPageInput = {
  page: number;
  pageSize: number;
  stage: OrdersStageFilter;
  orderStatusFilter: OrdersOrderStatusFilter;
  exportFilter: OrdersExportFilter;
  searchKey: OrdersSearchKey;
  q?: string;
  sortBy: OrdersSortBy;
  sortDir: OrdersSortDir;
  attemptFilter: OrdersAttemptFilter;
  followUpFilter: OrdersFollowUpFilter;
  sourceSystemFilter?: string | null;
  excludeSourceSystem?: string | null;
  createdFrom?: string | null;
  createdTo?: string | null;
};

export type ManagerOrdersPageInput = OrdersPageInput;
export type CallerOrdersPageInput = OrdersPageInput & { userId: string; focusMode?: boolean };
