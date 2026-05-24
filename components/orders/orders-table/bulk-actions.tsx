"use client";

import {
  ORDER_SHIPMENT_STAGE_VALUES,
  shipmentStageSelectLabel,
} from "@/lib/orders/shipment-stages";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OrdersTableBulkActionsProps = {
  callers: Array<{ id: string; name: string; email: string }>;
  assigneeId: string;
  onAssigneeIdChange: (value: string) => void;
  stageBulk: string;
  onStageBulkChange: (value: string) => void;
  pending: boolean;
  someSelected: boolean;
  selectedCount: number;
  onBulkAssign: () => void;
  onBulkStage: () => void;
};

export function OrdersTableBulkActions({
  callers,
  assigneeId,
  onAssigneeIdChange,
  stageBulk,
  onStageBulkChange,
  pending,
  someSelected,
  selectedCount,
  onBulkAssign,
  onBulkStage,
}: OrdersTableBulkActionsProps) {
  return (
    <div id="admin-orders-bulk-actions" className="flex flex-col gap-3 rounded-md border p-3">
      <p className="text-sm font-medium">Bulk actions</p>
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="flex min-w-[200px] flex-col gap-2">
          <span className="text-xs text-muted-foreground">Assign to caller</span>
          <Select value={assigneeId || undefined} onValueChange={onAssigneeIdChange}>
            <SelectTrigger className="w-full lg:w-[220px]" aria-label="Select caller for bulk assign">
              <SelectValue placeholder="Select caller" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {callers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" disabled={pending || !someSelected} onClick={onBulkAssign}>
          Assign selected
        </Button>
        <div className="flex min-w-[200px] flex-col gap-2">
          <span className="text-xs text-muted-foreground">Set stage (manual)</span>
          <Select value={stageBulk || undefined} onValueChange={onStageBulkChange}>
            <SelectTrigger className="w-full lg:w-[220px]" aria-label="Select stage for bulk update">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              align="start"
              className="max-h-72 w-(--radix-select-trigger-width) min-w-[14rem]"
            >
              <SelectGroup>
                {ORDER_SHIPMENT_STAGE_VALUES.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {shipmentStageSelectLabel(stage)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="secondary" disabled={pending || !someSelected} onClick={onBulkStage}>
          Set stage on selected
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {someSelected ? `${selectedCount} selected` : "No rows selected"} · Manual stage does not sync India Post
        tracking.
      </p>
    </div>
  );
}
