import type { ReactNode } from "react";
import type {
  OrdersAttemptFilter,
  OrdersExportFilter,
  OrdersFollowUpFilter,
  OrdersOrderStatusFilter,
  OrdersPageRow,
  OrdersSearchKey,
  OrdersSortBy,
  OrdersSortDir,
  OrdersStageFilter,
} from "@/lib/orders/types";

export const ROW_HEIGHT_PX = 58;

export const PAGE_SIZE_OPTIONS = [50, 100, 200, 300] as const;

export const SEARCH_KEY_OPTIONS: { value: OrdersSearchKey; label: string }[] = [
  { value: "customerName", label: "Name" },
  { value: "customerPhone", label: "Phone" },
  { value: "trackingNumber", label: "Tracking" },
  { value: "city", label: "City" },
  { value: "state", label: "State" },
];

export type OrdersTableCounts = {
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

export type OrdersTableFilters = {
  searchKey: OrdersSearchKey;
  q: string;
  stage: OrdersStageFilter;
  orderStatusFilter: OrdersOrderStatusFilter;
  exportFilter: OrdersExportFilter;
  attemptFilter: OrdersAttemptFilter;
  followUpFilter: OrdersFollowUpFilter;
  sortBy: OrdersSortBy;
  sortDir: OrdersSortDir;
  createdFrom?: string;
  createdTo?: string;
};

export type OrdersTableProps = {
  title: string;
  rows: OrdersPageRow[];
  counts: OrdersTableCounts;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: OrdersTableFilters;
  callers: Array<{ id: string; name: string; email: string }>;
  actions?: ReactNode;
  enableBulkActions?: boolean;
  enableCallerOrderActions?: boolean;
  showLastAttemptColumn?: boolean;
  showCommerceColumns?: boolean;
  extraQueryParams?: Record<string, string | undefined>;
  filterSummaryKpis?: boolean;
};

export function buildDesktopGridTemplate(opts: {
  showBulkCheckboxes: boolean;
  showCommerceColumns: boolean;
  showProductColumn: boolean;
  showTrackingColumn: boolean;
  showOrderStatusColumn: boolean;
  showShipmentStageColumn: boolean;
  enableCallerOrderActions: boolean;
}): string {
  const parts: string[] = [];
  if (opts.showBulkCheckboxes) parts.push("40px");
  parts.push("112px", "minmax(128px,1.25fr)", "minmax(104px,8.5rem)");
  if (opts.showCommerceColumns) {
    parts.push("minmax(72px,88px)", "minmax(96px,112px)");
    if (opts.showProductColumn) parts.push("minmax(130px,1fr)");
  }
  if (opts.showTrackingColumn) parts.push("120px");
  parts.push("minmax(148px,1.2fr)");
  if (opts.showOrderStatusColumn) parts.push("104px");
  if (opts.showShipmentStageColumn) parts.push("104px");
  if (opts.enableCallerOrderActions) parts.push("52px");
  parts.push("44px");
  return parts.join(" ");
}

export function buildHref(params: {
  page: number;
  pageSize: number;
  searchKey: OrdersSearchKey;
  q: string;
  stage: OrdersStageFilter;
  orderStatusFilter: OrdersOrderStatusFilter;
  exportFilter: OrdersExportFilter;
  attemptFilter: OrdersAttemptFilter;
  followUpFilter: OrdersFollowUpFilter;
  sortBy: OrdersSortBy;
  sortDir: OrdersSortDir;
  createdFrom?: string;
  createdTo?: string;
  extraQueryParams?: Record<string, string | undefined>;
}) {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page));
  sp.set("pageSize", String(params.pageSize));
  sp.set("searchKey", params.searchKey);
  if (params.q) sp.set("q", params.q);
  sp.set("stage", params.stage);
  sp.set("orderStatusFilter", params.orderStatusFilter);
  sp.set("exportFilter", params.exportFilter);
  sp.set("attemptFilter", params.attemptFilter);
  sp.set("followUpFilter", params.followUpFilter);
  sp.set("sortBy", params.sortBy);
  sp.set("sortDir", params.sortDir);
  if (params.createdFrom?.trim()) sp.set("createdFrom", params.createdFrom.trim());
  if (params.createdTo?.trim()) sp.set("createdTo", params.createdTo.trim());
  if (params.extraQueryParams) {
    Object.entries(params.extraQueryParams).forEach(([key, value]) => {
      if (value) sp.set(key, value);
    });
  }
  return `?${sp.toString()}`;
}

export function nextSort(
  column: OrdersSortBy,
  filters: OrdersTableFilters,
): { sortBy: OrdersSortBy; sortDir: OrdersSortDir } {
  if (filters.sortBy === column) {
    return { sortBy: column, sortDir: filters.sortDir === "asc" ? "desc" : "asc" };
  }
  return { sortBy: column, sortDir: "desc" };
}

export function ariaSortForColumn(column: OrdersSortBy, filters: OrdersTableFilters) {
  if (filters.sortBy !== column) return "none" as const;
  return filters.sortDir === "asc" ? ("ascending" as const) : ("descending" as const);
}

export function formatCreated(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function formatAssignedToWithAttempts(
  assignedTo: string | null | undefined,
  attemptCount: number,
): string {
  const label = assignedTo?.trim() ? assignedTo.trim() : "Unassigned";
  return `${label} (${attemptCount})`;
}

export function formatAttempt(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function toTelHref(phone: string) {
  const normalized = phone.replace(/[^\d+]/g, "");
  return `tel:${normalized}`;
}

export function hasSecondaryFiltersActive(filters: OrdersTableFilters) {
  return (
    filters.stage !== "ALL" ||
    filters.orderStatusFilter !== "ALL" ||
    filters.exportFilter !== "ALL" ||
    filters.attemptFilter !== "ALL" ||
    filters.followUpFilter !== "ALL" ||
    Boolean(filters.createdFrom?.trim()) ||
    Boolean(filters.createdTo?.trim())
  );
}

export type OrdersQueryHiddenFieldsProps = {
  page: number;
  pageSize: number;
  searchKey: OrdersSearchKey;
  q: string;
  stage: OrdersStageFilter;
  orderStatusFilter: OrdersOrderStatusFilter;
  exportFilter: OrdersExportFilter;
  attemptFilter: OrdersAttemptFilter;
  followUpFilter: OrdersFollowUpFilter;
  sortBy: OrdersSortBy;
  sortDir: OrdersSortDir;
  createdFrom?: string;
  createdTo?: string;
};

export type OrdersQueryHiddenExclude = keyof OrdersQueryHiddenFieldsProps;
