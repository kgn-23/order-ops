"use client";

import { ArrowUpIcon } from "lucide-react";

import { OrdersTableBulkActions } from "@/components/orders/orders-table/bulk-actions";
import { OrdersTableColumnsSheet } from "@/components/orders/orders-table/columns-sheet";
import { OrdersTableDesktopGrid } from "@/components/orders/orders-table/desktop-grid";
import { OrdersTableFiltersSheet } from "@/components/orders/orders-table/filters-sheet";
import { OrdersTableFooter, OrdersTableMobilePagination } from "@/components/orders/orders-table/footer";
import { OrdersTableKpis } from "@/components/orders/orders-table/kpis";
import { OrdersTableMobileList } from "@/components/orders/orders-table/mobile-list";
import { OrdersTableSearchBar } from "@/components/orders/orders-table/search-bar";
import type { OrdersTableProps } from "@/components/orders/orders-table/shared";
import { useOrdersTable } from "@/components/orders/orders-table/use-orders-table";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type AdminOrdersTableProps = OrdersTableProps;

export function AdminOrdersTable({
  title,
  rows,
  counts,
  pagination,
  filters,
  callers,
  actions,
  enableBulkActions = true,
  enableCallerOrderActions = true,
  showLastAttemptColumn = true,
  showCommerceColumns = false,
  extraQueryParams,
  filterSummaryKpis = false,
}: AdminOrdersTableProps) {
  const table = useOrdersTable({
    rows,
    pagination,
    filters,
    enableBulkActions,
    enableCallerOrderActions,
    showLastAttemptColumn,
    showCommerceColumns,
    extraQueryParams,
  });

  return (
    <Card className="min-w-0 overflow-visible">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardAction className="flex items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {actions != null ? (
              <div key="orders-toolbar-actions" className="contents">
                {actions}
              </div>
            ) : null}
            <div key="orders-toolbar-columns-sheet" className="contents">
              <OrdersTableColumnsSheet
                open={table.columnsSheetOpen}
                onOpenChange={table.setColumnsSheetOpen}
                visibleOptionalCols={table.visibleOptionalCols}
                onPatchOptionalCols={table.patchOptionalCols}
                showCommerceColumns={showCommerceColumns}
              />
            </div>
            {enableBulkActions ? (
              <div key="orders-toolbar-bulk-toggle" className="contents">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => table.setShowBulkActions((prev) => !prev)}
                  aria-expanded={table.showBulkActions}
                  aria-controls="admin-orders-bulk-actions"
                >
                  {table.showBulkActions ? "Hide bulk actions" : "Show bulk actions"}
                </Button>
              </div>
            ) : null}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        <OrdersTableKpis counts={counts} filterSummaryKpis={filterSummaryKpis} />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <OrdersTableSearchBar
            hiddenQueryFields={table.hiddenQueryFields}
            extraQueryParams={extraQueryParams}
            searchKey={table.searchKey}
            onSearchKeyChange={table.setSearchKey}
            searchKeyOptions={table.searchKeyOptions}
            defaultQuery={filters.q}
          />
          <OrdersTableFiltersSheet
            open={table.filtersSheetOpen}
            onOpenChange={table.setFiltersSheetOpen}
            hiddenQueryFields={table.hiddenQueryFields}
            extraQueryParams={extraQueryParams}
            filters={filters}
            resetFiltersHref={table.resetFiltersHref}
            secondaryFiltersActive={table.secondaryFiltersActive}
            showCommerceColumns={showCommerceColumns}
          />
        </div>

        {enableBulkActions && table.showBulkActions ? (
          <OrdersTableBulkActions
            callers={callers}
            assigneeId={table.assigneeId}
            onAssigneeIdChange={table.setAssigneeId}
            stageBulk={table.stageBulk}
            onStageBulkChange={table.setStageBulk}
            pending={table.pending}
            someSelected={table.someSelected}
            selectedCount={table.selected.size}
            onBulkAssign={table.runBulkAssign}
            onBulkStage={table.runBulkStage}
          />
        ) : null}

        <OrdersTableMobilePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          pageHref={table.pageHref}
        />

        <OrdersTableMobileList
          rows={rows}
          showBulkCheckboxes={table.showBulkCheckboxes}
          enableCallerOrderActions={enableCallerOrderActions}
          showCommerceColumns={showCommerceColumns}
          showLastAttemptColumn={showLastAttemptColumn}
          showOrderStatusColumn={table.showOrderStatusColumn}
          visibleOptionalCols={table.visibleOptionalCols}
          selected={table.selected}
          onToggleRow={table.toggleRow}
        />

        <OrdersTableDesktopGrid
          scrollRef={table.scrollRef}
          rowVirtualizer={table.rowVirtualizer}
          desktopGridTemplate={table.desktopGridTemplate}
          rows={rows}
          filters={filters}
          sortLink={table.sortLink}
          showBulkCheckboxes={table.showBulkCheckboxes}
          enableCallerOrderActions={enableCallerOrderActions}
          showCommerceColumns={showCommerceColumns}
          showProductColumn={table.showProductColumn}
          showTrackingColumn={table.showTrackingColumn}
          showLastAttemptColumn={showLastAttemptColumn}
          showOrderStatusColumn={table.showOrderStatusColumn}
          showShipmentStageColumn={table.showShipmentStageColumn}
          selected={table.selected}
          headerCheckboxState={table.headerCheckboxState}
          onToggleAll={table.toggleAll}
          onToggleRow={table.toggleRow}
        />

        <OrdersTableFooter
          pagination={pagination}
          pageHref={table.pageHref}
          hiddenQueryFields={table.hiddenQueryFields}
          extraQueryParams={extraQueryParams}
        />

        {table.showScrollTop ? (
          <Button
            type="button"
            size="icon"
            className="fixed right-4 bottom-20 z-30 rounded-full shadow-lg md:bottom-6"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Go to top"
          >
            <ArrowUpIcon className="size-4" />
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
