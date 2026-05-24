import { getSession } from "@/lib/auth";
import { getFormOptions } from "@/lib/orders/form-options";
import { getCallersForOrderAssign } from "@/lib/team/caller-assign";
import {
  getCallerOrdersPage,
  getManagerOrdersPage,
  getOrdersPage,
} from "@/lib/orders/queries";
import {
  ORDERS_LIST_VARIANTS,
  type OrdersListKind,
  ordersTableFilters,
} from "@/lib/orders/list-variants";
import {
  parseOrdersSearchParams,
  toOrdersPageInput,
  type RawSearchParams,
} from "@/lib/orders/search-params";
import type { OrdersPageResult } from "@/lib/orders/types";

import type { OrdersListRole } from "@/lib/orders/list-variants";

export type LoadedOrdersListPage = {
  variant: (typeof ORDERS_LIST_VARIANTS)[OrdersListKind];
  parsed: ReturnType<typeof parseOrdersSearchParams>;
  filters: ReturnType<typeof ordersTableFilters>;
  ordersPage: OrdersPageResult;
  callers: { id: string; name: string; email: string }[];
};

export async function loadOrdersListPage(input: {
  role: OrdersListRole;
  kind: OrdersListKind;
  searchParams?: RawSearchParams;
}): Promise<LoadedOrdersListPage> {
  const variant = ORDERS_LIST_VARIANTS[input.kind];
  const params = input.searchParams ?? {};
  const parsed = parseOrdersSearchParams(params, variant.searchKeys, input.kind);
  const filters = ordersTableFilters(parsed);
  const queryInput = toOrdersPageInput(parsed, variant.querySource);

  if (input.role === "admin") {
    const [formOptions, ordersPage] = await Promise.all([
      getFormOptions(),
      getOrdersPage(queryInput),
    ]);
    return { variant, parsed, filters, ordersPage, callers: formOptions.callers };
  }

  if (input.role === "manager") {
    const session = await getSession();
    const [callers, ordersPage] = await Promise.all([
      getCallersForOrderAssign({ role: "manager", managerUserId: session.userId }),
      getManagerOrdersPage(queryInput),
    ]);
    return { variant, parsed, filters, ordersPage, callers };
  }

  const session = await getSession();
  const ordersPage = await getCallerOrdersPage({
    ...queryInput,
    userId: session.userId,
    focusMode: parsed.focusMode,
  });
  return { variant, parsed, filters, ordersPage, callers: [] };
}
