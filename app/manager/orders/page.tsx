import { AddressValidationForm } from "@/components/orders/address-validation-form";
import { AdminOrdersTable } from "@/components/orders/admin-orders-table";
import { TrackingSyncForm } from "@/components/orders/tracking-sync-form";
import {
  getFormOptions,
  getManagerOrdersPage,
  type OrdersAttemptFilter,
  type OrdersFollowUpFilter,
  type OrdersSearchKey,
  type OrdersSortBy,
  type OrdersSortDir,
  type OrdersStageFilter,
} from "@/app/server/queries";

const PAGE_SIZES = [50, 100, 200, 300] as const;
const SEARCH_KEYS: OrdersSearchKey[] = ["customerName", "customerPhone", "trackingNumber", "city", "state"];
const STAGE_FILTERS: OrdersStageFilter[] = ["ALL", "BOOKED", "IN_TRANSIT", "DELIVERED", "RTO", "OTHER"];
const ATTEMPT_FILTERS: OrdersAttemptFilter[] = ["ALL", "CALLED", "NOT_CALLED"];
const FOLLOW_UP_FILTERS: OrdersFollowUpFilter[] = ["ALL", "WITH_FOLLOW_UP", "WITHOUT_FOLLOW_UP"];
const SORT_BY: OrdersSortBy[] = ["createdAt", "currentStage", "customerName"];
const SORT_DIR: OrdersSortDir[] = ["asc", "desc"];

type ManagerOrdersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function ManagerOrdersPage({ searchParams }: ManagerOrdersPageProps) {
  const params = (await searchParams) ?? {};
  const pageParam = Number(firstParam(params.page) ?? "1");
  const pageSizeParam = Number(firstParam(params.pageSize) ?? "50");
  const searchKeyParam = firstParam(params.searchKey);
  const q = firstParam(params.q)?.trim() ?? "";
  const stageParam = firstParam(params.stage);
  const attemptFilterParam = firstParam(params.attemptFilter);
  const followUpFilterParam = firstParam(params.followUpFilter);
  const sortByParam = firstParam(params.sortBy);
  const sortDirParam = firstParam(params.sortDir);

  const page = Number.isFinite(pageParam) ? Math.max(1, Math.floor(pageParam)) : 1;
  const pageSize = PAGE_SIZES.includes(pageSizeParam as (typeof PAGE_SIZES)[number]) ? pageSizeParam : 50;
  const searchKey = SEARCH_KEYS.includes(searchKeyParam as OrdersSearchKey)
    ? (searchKeyParam as OrdersSearchKey)
    : "customerName";
  const stage = STAGE_FILTERS.includes(stageParam as OrdersStageFilter)
    ? (stageParam as OrdersStageFilter)
    : "ALL";
  const attemptFilter = ATTEMPT_FILTERS.includes(attemptFilterParam as OrdersAttemptFilter)
    ? (attemptFilterParam as OrdersAttemptFilter)
    : "ALL";
  const followUpFilter = FOLLOW_UP_FILTERS.includes(followUpFilterParam as OrdersFollowUpFilter)
    ? (followUpFilterParam as OrdersFollowUpFilter)
    : "ALL";
  const sortBy = SORT_BY.includes(sortByParam as OrdersSortBy)
    ? (sortByParam as OrdersSortBy)
    : "createdAt";
  const sortDir = SORT_DIR.includes(sortDirParam as OrdersSortDir)
    ? (sortDirParam as OrdersSortDir)
    : "desc";

  const [formOptions, ordersPage] = await Promise.all([
    getFormOptions(),
    getManagerOrdersPage({ page, pageSize, searchKey, q, stage, attemptFilter, followUpFilter, sortBy, sortDir }),
  ]);

  return (
    <>
      <section className="grid gap-4 xl:grid-cols-2">
        <TrackingSyncForm orders={formOptions.orders} />
        <AddressValidationForm orders={formOptions.orders} />
      </section>
      <AdminOrdersTable
        title="Manager View of Orders"
        rows={ordersPage.rows}
        filters={{ searchKey, q, stage, attemptFilter, followUpFilter, sortBy, sortDir }}
        pagination={{
          page: ordersPage.page,
          pageSize: ordersPage.pageSize,
          total: ordersPage.total,
          totalPages: ordersPage.totalPages,
        }}
        counts={ordersPage.counts}
        callers={[]}
        enableBulkActions={false}
        showLastAttemptColumn
      />
    </>
  );
}
