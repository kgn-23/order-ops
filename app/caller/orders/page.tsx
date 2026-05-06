import Link from "next/link";
import { AdminOrdersTable } from "@/components/orders/admin-orders-table";
import { getSession } from "@/app/lib/auth";
import {
  getCallerOrdersPage,
  type OrdersAttemptFilter,
  type OrdersFollowUpFilter,
  type OrdersSearchKey,
  type OrdersSortBy,
  type OrdersSortDir,
  type OrdersStageFilter,
} from "@/app/server/queries";
import { Button } from "@/components/ui/button";

const PAGE_SIZES = [50, 100, 200, 300] as const;
const SEARCH_KEYS: OrdersSearchKey[] = ["customerName", "customerPhone", "trackingNumber", "city", "state"];
const STAGE_FILTERS: OrdersStageFilter[] = ["ALL", "BOOKED", "IN_TRANSIT", "DELIVERED", "RTO", "OTHER"];
const ATTEMPT_FILTERS: OrdersAttemptFilter[] = ["ALL", "CALLED", "NOT_CALLED"];
const FOLLOW_UP_FILTERS: OrdersFollowUpFilter[] = ["ALL", "WITH_FOLLOW_UP", "WITHOUT_FOLLOW_UP"];
const SORT_BY: OrdersSortBy[] = ["createdAt", "currentStage", "customerName"];
const SORT_DIR: OrdersSortDir[] = ["asc", "desc"];

type CallerOrdersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function CallerOrdersPage({ searchParams }: CallerOrdersPageProps) {
  const session = await getSession();
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
  const modeParam = firstParam(params.mode);
  const isFocusMode = modeParam === "focus";

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

  const ordersPage = await getCallerOrdersPage({
    userId: session.userId,
    page,
    pageSize,
    searchKey,
    q,
    stage,
    attemptFilter,
    followUpFilter,
    sortBy,
    sortDir,
    focusMode: isFocusMode,
  });

  return (
    <>
      <AdminOrdersTable
        title={isFocusMode ? "Focus Mode - Priority Calls" : "Orders Assigned to You"}
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
        extraQueryParams={isFocusMode ? { mode: "focus" } : undefined}
        actions={
          isFocusMode ? (
            <Button variant="outline" asChild>
              <Link href="/caller/orders?page=1&pageSize=50&searchKey=customerName&stage=ALL&attemptFilter=ALL&followUpFilter=ALL&sortBy=createdAt&sortDir=desc">
                Exit Focus Mode
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/caller/orders?page=1&pageSize=50&searchKey=customerName&stage=ALL&attemptFilter=ALL&followUpFilter=ALL&sortBy=createdAt&sortDir=desc&mode=focus">
                Focus Mode
              </Link>
            </Button>
          )
        }
      />
    </>
  );
}
