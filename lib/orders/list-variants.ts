import {
  STOREFRONT_SEARCH_KEYS,
  TRACKING_SEARCH_KEYS,
  type ParsedOrdersSearchParams,
} from "@/lib/orders/search-params";
import { STOREFRONT_ORDER_SOURCE } from "@/lib/orders/source";
import type { OrdersPageInput, OrdersSearchKey } from "@/lib/orders/types";

export type OrdersListKind = "tracking" | "storefront";

export type OrdersListVariant = {
  kind: OrdersListKind;
  title: string;
  searchKeys: readonly OrdersSearchKey[];
  querySource: Pick<OrdersPageInput, "sourceSystemFilter" | "excludeSourceSystem">;
  showCommerceColumns: boolean;
  bulkUploadListContext?: "tracking" | "storefront";
};

export const ORDERS_LIST_VARIANTS: Record<OrdersListKind, OrdersListVariant> = {
  tracking: {
    kind: "tracking",
    title: "All Orders",
    searchKeys: TRACKING_SEARCH_KEYS,
    querySource: { excludeSourceSystem: STOREFRONT_ORDER_SOURCE },
    showCommerceColumns: false,
    bulkUploadListContext: "tracking",
  },
  storefront: {
    kind: "storefront",
    title: "Storefront orders",
    searchKeys: STOREFRONT_SEARCH_KEYS,
    querySource: { sourceSystemFilter: STOREFRONT_ORDER_SOURCE },
    showCommerceColumns: true,
    bulkUploadListContext: "storefront",
  },
};

export type OrdersListRole = "admin" | "manager" | "caller";

/** Admin and manager share upload, export, and bulk order ops. */
export function roleCanManageOrderUpload(role: OrdersListRole): boolean {
  return role === "admin" || role === "manager";
}

export function ordersListBasePath(role: OrdersListRole, kind: OrdersListKind): string {
  const root = `/${role}/orders`;
  return kind === "storefront" ? `${root}/commerce` : root;
}

export function ordersListTitle(role: OrdersListRole, kind: OrdersListKind, focusMode: boolean): string {
  if (role === "caller" && focusMode) {
    return kind === "storefront" ? "Focus — storefront queue" : "Focus Mode - Priority Calls";
  }
  if (role === "caller") {
    return kind === "storefront" ? "Storefront orders assigned to you" : "Orders Assigned to You";
  }
  if (role === "manager" && kind === "tracking") {
    return "Manager View of Orders";
  }
  return ORDERS_LIST_VARIANTS[kind].title;
}

export function ordersTableFilters(parsed: ParsedOrdersSearchParams) {
  return {
    searchKey: parsed.searchKey,
    q: parsed.q,
    stage: parsed.stage,
    orderStatusFilter: parsed.orderStatusFilter,
    exportFilter: parsed.exportFilter,
    attemptFilter: parsed.attemptFilter,
    followUpFilter: parsed.followUpFilter,
    sortBy: parsed.sortBy,
    sortDir: parsed.sortDir,
    createdFrom: parsed.createdFrom ?? "",
    createdTo: parsed.createdTo ?? "",
  };
}
