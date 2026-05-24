import Link from "next/link";
import { AdminBulkUploadSheet } from "@/components/orders/admin-bulk-upload-sheet";
import { AdminOrdersTable } from "@/components/orders/admin-orders-table";
import { CodExportSheet } from "@/components/orders/cod-export-sheet";
import { Button } from "@/components/ui/button";
import { loadOrdersListPage } from "@/lib/orders/load-list-page";
import {
  ordersListBasePath,
  ordersListTitle,
  roleCanManageOrderUpload,
  type OrdersListKind,
  type OrdersListRole,
} from "@/lib/orders/list-variants";
import { buildOrdersNavQuery, type RawSearchParams } from "@/lib/orders/search-params";
import { getCodExportQueueCount } from "@/lib/orders/queries/cod-export";

type OrdersListPageProps = {
  role: OrdersListRole;
  kind: OrdersListKind;
  searchParams?: Promise<RawSearchParams>;
};

export async function OrdersListPage({ role, kind, searchParams }: OrdersListPageProps) {
  const params = (await searchParams) ?? {};
  const { variant, parsed, filters, ordersPage, callers } = await loadOrdersListPage({
    role,
    kind,
    searchParams: params,
  });

  const title = ordersListTitle(role, kind, parsed.focusMode);
  const basePath = ordersListBasePath(role, kind);
  const navQuery = buildOrdersNavQuery(parsed);
  const exitFocusHref = `${basePath}?${navQuery.toString()}`;
  const focusParams = new URLSearchParams(navQuery);
  focusParams.set("mode", "focus");
  const enterFocusHref = `${basePath}?${focusParams.toString()}`;

  const canManageUpload = roleCanManageOrderUpload(role);

  const bulkUpload =
    canManageUpload && variant.bulkUploadListContext ? (
      <AdminBulkUploadSheet
        key={`bulk-upload-${role}-${kind}`}
        callers={callers}
        listContext={variant.bulkUploadListContext}
      />
    ) : null;

  const showCodExport = kind === "storefront" && canManageUpload;
  const readyListParams = new URLSearchParams(navQuery);
  readyListParams.set("exportFilter", "READY");
  readyListParams.set("orderStatusFilter", "CONFIRMED");
  const readyListHref = `${basePath}?${readyListParams.toString()}`;

  const codExport =
    showCodExport ? (
      <CodExportSheet
        key={`cod-export-${role}`}
        initialReadyCount={await getCodExportQueueCount()}
        readyListHref={readyListHref}
      />
    ) : null;

  const callerActions =
    role === "caller" ? (
      parsed.focusMode ? (
        <Button variant="outline" asChild>
          <Link href={exitFocusHref}>Exit Focus Mode</Link>
        </Button>
      ) : (
        <Button asChild>
          <Link href={enterFocusHref}>Focus Mode</Link>
        </Button>
      )
    ) : null;

  const toolbarActions =
    codExport || bulkUpload || callerActions ? (
      <div key="orders-toolbar-actions" className="flex flex-wrap items-center gap-2">
        {codExport}
        {bulkUpload}
        {callerActions}
      </div>
    ) : null;

  return (
    <AdminOrdersTable
      title={title}
      rows={ordersPage.rows}
      filters={filters}
      pagination={{
        page: ordersPage.page,
        pageSize: ordersPage.pageSize,
        total: ordersPage.total,
        totalPages: ordersPage.totalPages,
      }}
      counts={ordersPage.counts}
      callers={callers}
      showCommerceColumns={variant.showCommerceColumns}
      actions={toolbarActions ?? undefined}
      showLastAttemptColumn
      enableCallerOrderActions={kind === "tracking" || role === "caller"}
      enableBulkActions={canManageUpload}
      extraQueryParams={parsed.focusMode ? { mode: "focus" } : undefined}
      filterSummaryKpis
    />
  );
}
