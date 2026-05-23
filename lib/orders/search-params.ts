import { parseOptionalIstDateParam } from "@/lib/ist-time";
import { CALL_OUTCOME_VALUES } from "@/lib/orders/call-outcomes";
import type { OrdersListKind } from "@/lib/orders/list-variants";
import { STOREFRONT_ORDER_STATUS_VALUES } from "@/lib/orders/storefront-order-status";
import type {
  OrdersAttemptFilter,
  OrdersExportFilter,
  OrdersFollowUpFilter,
  OrdersOrderStatusFilter,
  OrdersPageInput,
  OrdersSearchKey,
  OrdersSortBy,
  OrdersSortDir,
  OrdersStageFilter,
} from "@/lib/orders/types";

export const ORDERS_PAGE_SIZES = [50, 100, 200, 300] as const;

const STAGE_FILTERS: OrdersStageFilter[] = ["ALL", "BOOKED", "IN_TRANSIT", "DELIVERED", "RTO", "OTHER"];
const ATTEMPT_FILTERS: OrdersAttemptFilter[] = ["ALL", "NOT_CALLED", ...CALL_OUTCOME_VALUES];
const ORDER_STATUS_FILTERS: OrdersOrderStatusFilter[] = ["ALL", ...STOREFRONT_ORDER_STATUS_VALUES];
const EXPORT_FILTERS: OrdersExportFilter[] = ["ALL", "READY", "EXPORTED"];
const FOLLOW_UP_FILTERS: OrdersFollowUpFilter[] = ["ALL", "WITH_FOLLOW_UP", "WITHOUT_FOLLOW_UP"];
const SORT_BY: OrdersSortBy[] = ["createdAt", "currentStage", "customerName"];
const SORT_DIR: OrdersSortDir[] = ["asc", "desc"];

export const TRACKING_SEARCH_KEYS: OrdersSearchKey[] = [
  "customerName",
  "customerPhone",
  "trackingNumber",
  "city",
  "state",
];

export const STOREFRONT_SEARCH_KEYS: OrdersSearchKey[] = [
  ...TRACKING_SEARCH_KEYS,
  "merchantOrderDisplayName",
];

export type RawSearchParams = Record<string, string | string[] | undefined>;

export function firstSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export type ParsedOrdersSearchParams = {
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
  focusMode: boolean;
};

export function parseOrdersSearchParams(
  params: RawSearchParams,
  searchKeys: readonly OrdersSearchKey[],
  listKind: OrdersListKind = "tracking",
): ParsedOrdersSearchParams {
  const pageParam = Number(firstSearchParam(params.page) ?? "1");
  const pageSizeParam = Number(firstSearchParam(params.pageSize) ?? "50");
  const searchKeyParam = firstSearchParam(params.searchKey);
  const q = firstSearchParam(params.q)?.trim() ?? "";
  const stageParam = firstSearchParam(params.stage);
  const orderStatusParam = firstSearchParam(params.orderStatusFilter);
  const exportFilterParam = firstSearchParam(params.exportFilter);
  const followUpFilterParam = firstSearchParam(params.followUpFilter);
  const sortByParam = firstSearchParam(params.sortBy);
  const sortDirParam = firstSearchParam(params.sortDir);
  const modeParam = firstSearchParam(params.mode);
  const createdFrom = parseOptionalIstDateParam(firstSearchParam(params.createdFrom));
  const createdTo = parseOptionalIstDateParam(firstSearchParam(params.createdTo));

  const page = Number.isFinite(pageParam) ? Math.max(1, Math.floor(pageParam)) : 1;
  const pageSize = ORDERS_PAGE_SIZES.includes(pageSizeParam as (typeof ORDERS_PAGE_SIZES)[number])
    ? pageSizeParam
    : 50;
  const searchKey = searchKeys.includes(searchKeyParam as OrdersSearchKey)
    ? (searchKeyParam as OrdersSearchKey)
    : "customerName";
  const stage =
    listKind === "storefront"
      ? "ALL"
      : STAGE_FILTERS.includes(stageParam as OrdersStageFilter)
        ? (stageParam as OrdersStageFilter)
        : "ALL";
  const orderStatusFilter =
    listKind === "storefront" && ORDER_STATUS_FILTERS.includes(orderStatusParam as OrdersOrderStatusFilter)
      ? (orderStatusParam as OrdersOrderStatusFilter)
      : "ALL";
  const exportFilter =
    listKind === "storefront" && EXPORT_FILTERS.includes(exportFilterParam as OrdersExportFilter)
      ? (exportFilterParam as OrdersExportFilter)
      : "ALL";
  const attemptFilterParam = firstSearchParam(params.attemptFilter);
  const attemptFilter = ATTEMPT_FILTERS.includes(attemptFilterParam as OrdersAttemptFilter)
    ? (attemptFilterParam as OrdersAttemptFilter)
    : "ALL";
  const followUpFilter = FOLLOW_UP_FILTERS.includes(followUpFilterParam as OrdersFollowUpFilter)
    ? (followUpFilterParam as OrdersFollowUpFilter)
    : "ALL";
  const sortBy = SORT_BY.includes(sortByParam as OrdersSortBy) ? (sortByParam as OrdersSortBy) : "createdAt";
  const sortDir = SORT_DIR.includes(sortDirParam as OrdersSortDir) ? (sortDirParam as OrdersSortDir) : "desc";

  return {
    page,
    pageSize,
    searchKey,
    q,
    stage,
    orderStatusFilter,
    exportFilter,
    attemptFilter,
    followUpFilter,
    sortBy,
    sortDir,
    createdFrom,
    createdTo,
    focusMode: modeParam === "focus",
  };
}

export function toOrdersPageInput(
  parsed: ParsedOrdersSearchParams,
  source: Pick<OrdersPageInput, "sourceSystemFilter" | "excludeSourceSystem">,
): OrdersPageInput {
  return {
    page: parsed.page,
    pageSize: parsed.pageSize,
    searchKey: parsed.searchKey,
    q: parsed.q,
    stage: parsed.stage,
    orderStatusFilter: parsed.orderStatusFilter,
    exportFilter: parsed.exportFilter,
    attemptFilter: parsed.attemptFilter,
    followUpFilter: parsed.followUpFilter,
    sortBy: parsed.sortBy,
    sortDir: parsed.sortDir,
    createdFrom: parsed.createdFrom ?? null,
    createdTo: parsed.createdTo ?? null,
    ...source,
  };
}
export function buildOrdersNavQuery(parsed: ParsedOrdersSearchParams): URLSearchParams {
  const sp = new URLSearchParams({
    page: "1",
    pageSize: String(parsed.pageSize),
    searchKey: parsed.searchKey,
    q: parsed.q,
    stage: parsed.stage,
    orderStatusFilter: parsed.orderStatusFilter,
    exportFilter: parsed.exportFilter,
    attemptFilter: parsed.attemptFilter,
    followUpFilter: parsed.followUpFilter,
    sortBy: parsed.sortBy,
    sortDir: parsed.sortDir,
  });
  if (parsed.createdFrom) sp.set("createdFrom", parsed.createdFrom);
  if (parsed.createdTo) sp.set("createdTo", parsed.createdTo);
  return sp;
}

