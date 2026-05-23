import { CallLogsTable } from "@/components/call-logs/call-logs-table";
import {
  CALL_LOGS_OUTCOME_FILTERS,
  getCallLogsPage,
  type CallLogsOutcomeFilter,
  type CallLogsSearchKey,
  type CallLogsSortBy,
  type CallLogsSortDir,
  type CallLogsStageFilter,
} from "@/lib/call-logs/queries";

const PAGE_SIZES = [50, 100, 200, 300] as const;
const SEARCH_KEYS: CallLogsSearchKey[] = ["orderId", "customerName", "customerPhone", "callerName"];
const OUTCOME_FILTERS = CALL_LOGS_OUTCOME_FILTERS;
const STAGE_FILTERS: CallLogsStageFilter[] = ["ALL", "BOOKED", "IN_TRANSIT", "DELIVERED", "RTO", "OTHER"];
const SORT_BY: CallLogsSortBy[] = ["calledAt", "callerName", "outcome"];
const SORT_DIR: CallLogsSortDir[] = ["asc", "desc"];

type ManagerCallLogsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function ManagerCallLogsPage({ searchParams }: ManagerCallLogsPageProps) {
  const params = (await searchParams) ?? {};
  const pageParam = Number(firstParam(params.page) ?? "1");
  const pageSizeParam = Number(firstParam(params.pageSize) ?? "50");
  const searchKeyParam = firstParam(params.searchKey);
  const q = firstParam(params.q)?.trim() ?? "";
  const outcomeParam = firstParam(params.outcome);
  const stageParam = firstParam(params.stage);
  const sortByParam = firstParam(params.sortBy);
  const sortDirParam = firstParam(params.sortDir);

  const page = Number.isFinite(pageParam) ? Math.max(1, Math.floor(pageParam)) : 1;
  const pageSize = PAGE_SIZES.includes(pageSizeParam as (typeof PAGE_SIZES)[number]) ? pageSizeParam : 50;
  const searchKey = SEARCH_KEYS.includes(searchKeyParam as CallLogsSearchKey)
    ? (searchKeyParam as CallLogsSearchKey)
    : "orderId";
  const outcome = OUTCOME_FILTERS.includes(outcomeParam as CallLogsOutcomeFilter)
    ? (outcomeParam as CallLogsOutcomeFilter)
    : "ALL";
  const stage = STAGE_FILTERS.includes(stageParam as CallLogsStageFilter)
    ? (stageParam as CallLogsStageFilter)
    : "ALL";
  const sortBy = SORT_BY.includes(sortByParam as CallLogsSortBy) ? (sortByParam as CallLogsSortBy) : "calledAt";
  const sortDir = SORT_DIR.includes(sortDirParam as CallLogsSortDir) ? (sortDirParam as CallLogsSortDir) : "desc";

  const logsPage = await getCallLogsPage({ page, pageSize, searchKey, q, outcome, stage, sortBy, sortDir });

  return (
    <CallLogsTable
      title="Manager Call Logs"
      rows={logsPage.rows}
      counts={logsPage.counts}
      topCallers={logsPage.topCallers}
      pagination={{
        page: logsPage.page,
        pageSize: logsPage.pageSize,
        total: logsPage.total,
        totalPages: logsPage.totalPages,
      }}
      filters={{ searchKey, q, outcome, stage, sortBy, sortDir }}
      showCallerColumn
      showTopCallers
    />
  );
}
