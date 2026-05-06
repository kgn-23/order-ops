export const ACTIVITY_LOG_SORTS = [
  "createdAt_desc",
  "createdAt_asc",
  "action_asc",
  "action_desc",
  "entityType_asc",
  "entityType_desc",
] as const;

export type ActivityLogSort = (typeof ACTIVITY_LOG_SORTS)[number];

export function parseActivityLogSort(value: string | undefined): ActivityLogSort {
  if (value && (ACTIVITY_LOG_SORTS as readonly string[]).includes(value)) {
    return value as ActivityLogSort;
  }
  return "createdAt_desc";
}

export type ActivityUrlState = {
  page: number;
  pageSize: number;
  sort: ActivityLogSort;
  action: string;
  entityType: string;
};

function firstParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export function parseActivitySearchParams(
  sp: Record<string, string | string[] | undefined>,
): ActivityUrlState {
  const pageRaw = parseInt(firstParam(sp.page) ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const pageSizeRaw = parseInt(firstParam(sp.pageSize) ?? "20", 10);
  const pageSize =
    Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.min(100, Math.max(10, pageSizeRaw)) : 20;
  const sort = parseActivityLogSort(firstParam(sp.sort));
  const action = (firstParam(sp.action) ?? "").trim();
  const entityType = (firstParam(sp.entityType) ?? "").trim();
  return { page, pageSize, sort, action, entityType };
}

export function activitySearchParamsString(state: ActivityUrlState): string {
  const params = new URLSearchParams();
  params.set("page", String(state.page));
  params.set("pageSize", String(state.pageSize));
  params.set("sort", state.sort);
  if (state.action) params.set("action", state.action);
  if (state.entityType) params.set("entityType", state.entityType);
  return params.toString();
}
