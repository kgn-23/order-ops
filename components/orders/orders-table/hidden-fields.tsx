"use client";

import type { OrdersQueryHiddenExclude, OrdersQueryHiddenFieldsProps } from "@/components/orders/orders-table/shared";

export function OrdersQueryHiddenFields({
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
  exclude = [],
}: OrdersQueryHiddenFieldsProps & { exclude?: OrdersQueryHiddenExclude[] }) {
  const skip = new Set(exclude);
  return (
    <>
      {!skip.has("page") ? <input type="hidden" name="page" value={String(page)} /> : null}
      {!skip.has("pageSize") ? <input type="hidden" name="pageSize" value={String(pageSize)} /> : null}
      {!skip.has("searchKey") ? <input type="hidden" name="searchKey" value={searchKey} /> : null}
      {!skip.has("q") && q ? <input type="hidden" name="q" value={q} /> : null}
      {!skip.has("stage") ? <input type="hidden" name="stage" value={stage} /> : null}
      {!skip.has("orderStatusFilter") ? (
        <input type="hidden" name="orderStatusFilter" value={orderStatusFilter} />
      ) : null}
      {!skip.has("exportFilter") ? (
        <input type="hidden" name="exportFilter" value={exportFilter} />
      ) : null}
      {!skip.has("attemptFilter") ? (
        <input type="hidden" name="attemptFilter" value={attemptFilter} />
      ) : null}
      {!skip.has("followUpFilter") ? (
        <input type="hidden" name="followUpFilter" value={followUpFilter} />
      ) : null}
      {!skip.has("sortBy") ? <input type="hidden" name="sortBy" value={sortBy} /> : null}
      {!skip.has("sortDir") ? <input type="hidden" name="sortDir" value={sortDir} /> : null}
      {!skip.has("createdFrom") && createdFrom?.trim() ? (
        <input type="hidden" name="createdFrom" value={createdFrom.trim()} />
      ) : null}
      {!skip.has("createdTo") && createdTo?.trim() ? (
        <input type="hidden" name="createdTo" value={createdTo.trim()} />
      ) : null}
    </>
  );
}

export function ExtraQueryHiddenFields({
  extraQueryParams,
}: {
  extraQueryParams?: Record<string, string | undefined>;
}) {
  if (!extraQueryParams) return null;
  return (
    <>
      {Object.entries(extraQueryParams).map(([key, value]) =>
        value ? <input key={key} type="hidden" name={key} value={value} /> : null,
      )}
    </>
  );
}
