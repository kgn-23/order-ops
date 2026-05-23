"use client";

import { LayoutGridIcon } from "lucide-react";

import type { OrdersOptionalColumns } from "@/components/orders/orders-column-preferences";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type OrdersTableColumnsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visibleOptionalCols: OrdersOptionalColumns;
  onPatchOptionalCols: (patch: Partial<OrdersOptionalColumns>) => void;
  showCommerceColumns: boolean;
};

export function OrdersTableColumnsSheet({
  open,
  onOpenChange,
  visibleOptionalCols,
  onPatchOptionalCols,
  showCommerceColumns,
}: OrdersTableColumnsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" aria-label="Choose visible table columns">
          <LayoutGridIcon className="mr-2 size-4" />
          Columns
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Table columns</SheetTitle>
          <SheetDescription>
            {showCommerceColumns
              ? "Order status is always shown on storefront orders. Optionally show the product line column."
              : "Show or hide columns in this orders table. Tracking number and shipment stage stay hidden until you turn them on here."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-8 pt-4">
          {!showCommerceColumns ? (
            <>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="orders-col-tracking"
                  checked={visibleOptionalCols.tracking}
                  onCheckedChange={(c) => onPatchOptionalCols({ tracking: c === true })}
                />
                <Label htmlFor="orders-col-tracking" className="cursor-pointer font-normal leading-snug">
                  Tracking number
                </Label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="orders-col-status"
                  checked={visibleOptionalCols.status}
                  onCheckedChange={(c) => onPatchOptionalCols({ status: c === true })}
                />
                <Label htmlFor="orders-col-status" className="cursor-pointer font-normal leading-snug">
                  Shipment stage
                </Label>
              </div>
            </>
          ) : null}
          {showCommerceColumns ? (
            <div className="flex items-start gap-3">
              <Checkbox
                id="orders-col-product"
                checked={visibleOptionalCols.product}
                onCheckedChange={(c) => onPatchOptionalCols({ product: c === true })}
              />
              <Label htmlFor="orders-col-product" className="cursor-pointer font-normal leading-snug">
                Product / line title
              </Label>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
