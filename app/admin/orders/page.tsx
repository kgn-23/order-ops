import { AdminBulkUploadSheet } from "@/components/orders/admin-bulk-upload-sheet";
import { AdminOrdersTable } from "@/components/orders/admin-orders-table";
import {
  getFormOptions,
  getOrdersPage,
  type OrdersSearchKey,
  type OrdersSortBy,
  type OrdersSortDir,
  type OrdersStageFilter,
} from "@/app/server/queries";

const PAGE_SIZES = [50, 100, 200, 300] as const;
const SEARCH_KEYS: OrdersSearchKey[] = ["customerName", "customerPhone", "trackingNumber", "city", "state"];
const STAGE_FILTERS: OrdersStageFilter[] = ["ALL", "BOOKED", "IN_TRANSIT", "DELIVERED", "RTO", "OTHER"];
const SORT_BY: OrdersSortBy[] = ["createdAt", "currentStage", "customerName"];
const SORT_DIR: OrdersSortDir[] = ["asc", "desc"];

type AdminOrdersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const params = (await searchParams) ?? {};
  const pageParam = Number(firstParam(params.page) ?? "1");
  const pageSizeParam = Number(firstParam(params.pageSize) ?? "50");
  const searchKeyParam = firstParam(params.searchKey);
  const q = firstParam(params.q)?.trim() ?? "";
  const stageParam = firstParam(params.stage);
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
  const sortBy = SORT_BY.includes(sortByParam as OrdersSortBy)
    ? (sortByParam as OrdersSortBy)
    : "createdAt";
  const sortDir = SORT_DIR.includes(sortDirParam as OrdersSortDir)
    ? (sortDirParam as OrdersSortDir)
    : "desc";

  const [formOptions, ordersPage] = await Promise.all([
    getFormOptions(),
    getOrdersPage({ page, pageSize, searchKey, q, stage, sortBy, sortDir }),
  ]);

  return (
    <AdminOrdersTable
      title="All Orders"
      rows={ordersPage.rows}
      filters={{ searchKey, q, stage, sortBy, sortDir }}
      pagination={{
        page: ordersPage.page,
        pageSize: ordersPage.pageSize,
        total: ordersPage.total,
        totalPages: ordersPage.totalPages,
      }}
      counts={ordersPage.counts}
      callers={formOptions.callers}
      actions={<AdminBulkUploadSheet callers={formOptions.callers} />}
    />
  );
}
