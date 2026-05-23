"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";

import { assignOrders, bulkSetOrderStage } from "@/lib/orders/actions/assignment";
import {
  DEFAULT_ORDERS_OPTIONAL_COLUMNS,
  loadAdminOrdersColumnsPersistShape,
  saveAdminOrdersColumnsPersistShape,
  type OrdersColumnsPersistShape,
  type OrdersOptionalColumns,
} from "@/components/orders/orders-column-preferences";
import {
  ROW_HEIGHT_PX,
  SEARCH_KEY_OPTIONS,
  buildDesktopGridTemplate,
  buildHref,
  hasSecondaryFiltersActive,
  nextSort,
  type OrdersTableProps,
} from "@/components/orders/orders-table/shared";
import type { OrdersSearchKey, OrdersSortBy } from "@/lib/orders/types";

type UseOrdersTableInput = Pick<
  OrdersTableProps,
  | "rows"
  | "pagination"
  | "filters"
  | "enableBulkActions"
  | "enableCallerOrderActions"
  | "showLastAttemptColumn"
  | "showCommerceColumns"
  | "extraQueryParams"
>;

export function useOrdersTable({
  rows,
  pagination,
  filters,
  enableBulkActions = true,
  enableCallerOrderActions = true,
  showLastAttemptColumn = true,
  showCommerceColumns = false,
  extraQueryParams,
}: UseOrdersTableInput) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
  const [searchKey, setSearchKey] = useState<OrdersSearchKey>(filters.searchKey);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assigneeId, setAssigneeId] = useState("");
  const [stageBulk, setStageBulk] = useState("");
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [columnsPersist, setColumnsPersist] = useState<OrdersColumnsPersistShape>(() => ({
    standard: { ...DEFAULT_ORDERS_OPTIONAL_COLUMNS },
    commerce: { ...DEFAULT_ORDERS_OPTIONAL_COLUMNS },
  }));
  const [columnsSheetOpen, setColumnsSheetOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSelected(new Set());
  }, [rows]);

  useEffect(() => {
    setSearchKey(filters.searchKey);
  }, [filters.searchKey]);

  useEffect(() => {
    setColumnsPersist(loadAdminOrdersColumnsPersistShape());
  }, []);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 240);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const searchKeyOptions = useMemo(() => {
    const opts: { value: OrdersSearchKey; label: string }[] = [...SEARCH_KEY_OPTIONS];
    if (showCommerceColumns) opts.push({ value: "merchantOrderDisplayName", label: "Merchant #" });
    return opts;
  }, [showCommerceColumns]);

  const visibleOptionalCols = columnsPersist[showCommerceColumns ? "commerce" : "standard"];

  const patchOptionalCols = useCallback(
    (patch: Partial<OrdersOptionalColumns>) => {
      const branch = showCommerceColumns ? "commerce" : "standard";
      setColumnsPersist((prev) => {
        const nextShape: OrdersColumnsPersistShape = {
          ...prev,
          [branch]: { ...prev[branch], ...patch },
        };
        saveAdminOrdersColumnsPersistShape(nextShape);
        return nextShape;
      });
    },
    [showCommerceColumns],
  );

  const showProductColumn = showCommerceColumns && visibleOptionalCols.product;
  const showTrackingColumn = !showCommerceColumns && visibleOptionalCols.tracking;
  const showShipmentStageColumn = !showCommerceColumns && visibleOptionalCols.status;
  const showOrderStatusColumn = showCommerceColumns;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT_PX,
    overscan: 12,
  });

  const showBulkCheckboxes = enableBulkActions && showBulkActions;

  const desktopGridTemplate = useMemo(
    () =>
      buildDesktopGridTemplate({
        showBulkCheckboxes,
        showCommerceColumns,
        showProductColumn,
        showTrackingColumn,
        showOrderStatusColumn,
        showShipmentStageColumn,
        enableCallerOrderActions,
      }),
    [
      showBulkCheckboxes,
      showCommerceColumns,
      showProductColumn,
      showTrackingColumn,
      showOrderStatusColumn,
      showShipmentStageColumn,
      enableCallerOrderActions,
    ],
  );

  const baseParams = useMemo(
    () => ({
      pageSize: pagination.pageSize,
      searchKey: filters.searchKey,
      q: filters.q,
      stage: filters.stage,
      orderStatusFilter: filters.orderStatusFilter,
      exportFilter: filters.exportFilter,
      attemptFilter: filters.attemptFilter,
      followUpFilter: filters.followUpFilter,
      sortBy: filters.sortBy,
      sortDir: filters.sortDir,
      createdFrom: filters.createdFrom ?? "",
      createdTo: filters.createdTo ?? "",
      extraQueryParams,
    }),
    [pagination.pageSize, filters, extraQueryParams],
  );

  const sortLink = useCallback(
    (column: OrdersSortBy) => {
      const ns = nextSort(column, filters);
      return buildHref({ page: 1, ...baseParams, sortBy: ns.sortBy, sortDir: ns.sortDir });
    },
    [baseParams, filters],
  );

  const pageHref = useCallback(
    (page: number) =>
      buildHref({ page, ...baseParams, sortBy: filters.sortBy, sortDir: filters.sortDir }),
    [baseParams, filters.sortBy, filters.sortDir],
  );

  const resetFiltersHref = useMemo(
    () =>
      buildHref({
        page: 1,
        pageSize: pagination.pageSize,
        searchKey: filters.searchKey,
        q: filters.q,
        stage: "ALL",
        orderStatusFilter: "ALL",
        exportFilter: "ALL",
        attemptFilter: "ALL",
        followUpFilter: "ALL",
        sortBy: filters.sortBy,
        sortDir: filters.sortDir,
        createdFrom: "",
        createdTo: "",
        extraQueryParams,
      }),
    [pagination.pageSize, filters, extraQueryParams],
  );

  const hiddenQueryFields = useMemo(
    () => ({
      page: 1,
      pageSize: pagination.pageSize,
      searchKey: filters.searchKey,
      q: filters.q,
      stage: filters.stage,
      orderStatusFilter: filters.orderStatusFilter,
      exportFilter: filters.exportFilter,
      attemptFilter: filters.attemptFilter,
      followUpFilter: filters.followUpFilter,
      sortBy: filters.sortBy,
      sortDir: filters.sortDir,
      createdFrom: filters.createdFrom,
      createdTo: filters.createdTo,
    }),
    [pagination.pageSize, filters],
  );

  const allIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;
  const headerCheckboxState: boolean | "indeterminate" =
    allIds.length === 0 ? false : allSelected ? true : someSelected ? "indeterminate" : false;

  const toggleAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }, [allIds, allSelected]);

  const toggleRow = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const runBulkAssign = useCallback(() => {
    if (selected.size === 0) {
      toast.message("Select at least one order.");
      return;
    }
    if (!assigneeId) {
      toast.message("Choose a caller to assign.");
      return;
    }
    const ids = Array.from(selected);
    startTransition(async () => {
      try {
        await assignOrders({ orderIds: ids, assigneeId, assignmentType: "MANUAL" });
        toast.success(`Assigned ${ids.length} order(s).`);
        setSelected(new Set());
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Assignment failed.");
      }
    });
  }, [assigneeId, selected]);

  const runBulkStage = useCallback(() => {
    if (selected.size === 0) {
      toast.message("Select at least one order.");
      return;
    }
    if (!stageBulk) {
      toast.message("Choose a stage.");
      return;
    }
    const ids = Array.from(selected);
    startTransition(async () => {
      try {
        await bulkSetOrderStage({
          orderIds: ids,
          stage: stageBulk as "BOOKED" | "IN_TRANSIT" | "DELIVERED" | "RTO" | "OTHER",
        });
        toast.success(`Updated stage for ${ids.length} order(s).`);
        setSelected(new Set());
        setStageBulk("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Stage update failed.");
      }
    });
  }, [selected, stageBulk]);

  return {
    scrollRef,
    showScrollTop,
    filtersSheetOpen,
    setFiltersSheetOpen,
    searchKey,
    setSearchKey,
    selected,
    assigneeId,
    setAssigneeId,
    stageBulk,
    setStageBulk,
    showBulkActions,
    setShowBulkActions,
    showBulkCheckboxes,
    columnsSheetOpen,
    setColumnsSheetOpen,
    pending,
    searchKeyOptions,
    visibleOptionalCols,
    patchOptionalCols,
    showProductColumn,
    showTrackingColumn,
    showOrderStatusColumn,
    showShipmentStageColumn,
    rowVirtualizer,
    desktopGridTemplate,
    sortLink,
    pageHref,
    resetFiltersHref,
    secondaryFiltersActive: hasSecondaryFiltersActive(filters),
    hiddenQueryFields,
    someSelected,
    headerCheckboxState,
    toggleAll,
    toggleRow,
    runBulkAssign,
    runBulkStage,
  };
}
