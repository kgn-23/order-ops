"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Expand, XIcon } from "lucide-react";

import { getOrderDetails, type OrderDetailPayload } from "@/lib/orders/actions/order-details";
import { useIsMobile } from "@/hooks/use-mobile";
import { OrderDetailTabs } from "@/components/orders/order-detail-tabs";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type OrderDetailsTriggerVariant = "default" | "icon";

export function OrderDetailsDrawer({
  orderId,
  customerName,
  triggerVariant = "default",
  triggerClassName,
}: {
  orderId: string;
  customerName: string;
  triggerVariant?: OrderDetailsTriggerVariant;
  triggerClassName?: string;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [details, setDetails] = useState<OrderDetailPayload | null>(null);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next || details) return;
    startTransition(async () => {
      try {
        const payload = await getOrderDetails(orderId);
        setDetails(payload);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load order details.");
      }
    });
  };

  const trigger =
    triggerVariant === "icon" ? (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "size-8 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground",
          triggerClassName,
        )}
        aria-label="View order details"
        onClick={() => handleOpenChange(true)}
      >
        <Expand className="size-4" />
      </Button>
    ) : (
      <Button type="button" variant="outline" size="sm" onClick={() => handleOpenChange(true)}>
        View
      </Button>
    );

  const detailsPanel = (
    <>
      {pending && !details ? (
        <p className="text-sm text-muted-foreground">Loading order details...</p>
      ) : details ? (
        <OrderDetailTabs details={details} />
      ) : (
        <p className="text-sm text-muted-foreground">Open the panel to load order details.</p>
      )}
    </>
  );

  return (
    <>
      {triggerVariant === "icon" ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="top">Expand row</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}

      {isMobile ? (
        <Drawer open={open} onOpenChange={handleOpenChange} direction="bottom">
          <DrawerContent className="rounded-none border-0 !inset-0 !h-screen !w-screen !max-w-none data-[vaul-drawer-direction=bottom]:max-h-[100dvh]">
            <DrawerHeader className="border-b">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <DrawerTitle>Order details</DrawerTitle>
                  <DrawerDescription>{customerName}</DrawerDescription>
                </div>
                <DrawerClose asChild>
                  <Button type="button" variant="outline" size="icon" aria-label="Close order details">
                    <XIcon />
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4">{detailsPanel}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={open} onOpenChange={handleOpenChange}>
          <SheetContent
            side="right"
            showCloseButton
            className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
          >
            <SheetHeader className="border-b px-4 py-4 text-left">
              <SheetTitle>Order details</SheetTitle>
              <SheetDescription>{customerName}</SheetDescription>
            </SheetHeader>
            <div className="orders-data-grid-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
              {detailsPanel}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
