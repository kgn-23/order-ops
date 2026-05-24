"use client";

import { useCallback, useState, useTransition } from "react";
import { NotebookPenIcon } from "lucide-react";
import { toast } from "sonner";

import { addFollowUp, logCall } from "@/lib/orders/actions/calls";
import { setOrderStage } from "@/lib/orders/actions/assignment";
import { getOrderDetails, type OrderDetailPayload } from "@/lib/orders/actions/order-details";
import {
  ConfirmAddressFields,
  type ConfirmAddressValues,
} from "@/components/orders/confirm-address-fields";
import { OrderDetailTabs } from "@/components/orders/order-detail-tabs";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  CALL_OUTCOME_LABELS,
  CALL_OUTCOME_VALUES,
  isStorefrontConfirmOutcome,
  STOREFRONT_CONFIRM_OUTCOME,
} from "@/lib/orders/call-outcomes";
import {
  ORDER_SHIPMENT_STAGE_VALUES,
  shipmentStageSelectLabel,
  type OrderShipmentStageValue,
} from "@/lib/orders/shipment-stages";
import { ShipmentStageBadge } from "@/components/orders/status-badges";
import {
  isStorefrontOrderConfirmed,
  parseStorefrontOrderStatus,
  STOREFRONT_ORDER_STATUS_LABELS,
  STOREFRONT_ORDER_STATUS_VALUES,
  type StorefrontOrderStatus,
} from "@/lib/orders/storefront-order-status";

function parseShipmentStage(raw: string | null | undefined): OrderShipmentStageValue {
  if (raw && (ORDER_SHIPMENT_STAGE_VALUES as readonly string[]).includes(raw)) {
    return raw as OrderShipmentStageValue;
  }
  return "BOOKED";
}

function emptyConfirmAddress(customerName: string, customerPhone: string): ConfirmAddressValues {
  return {
    customerName,
    customerPhone,
    addressLine1: "",
    addressLine2: "",
    addressLine3: "",
    city: "",
    state: "",
    postalCode: "",
  };
}

function confirmAddressFromDetails(details: OrderDetailPayload): ConfirmAddressValues {
  return {
    customerName: details.customerName,
    customerPhone: details.customerPhone,
    addressLine1: details.addressLine1,
    addressLine2: details.addressLine2 ?? "",
    addressLine3: details.addressLine3 ?? "",
    city: details.city,
    state: details.state,
    postalCode: details.postalCode,
  };
}

function isConfirmAddressComplete(values: ConfirmAddressValues): boolean {
  return Boolean(
    values.customerName.trim() &&
      values.customerPhone.trim() &&
      values.addressLine1.trim() &&
      values.city.trim() &&
      values.state.trim() &&
      values.postalCode.trim(),
  );
}

export function OrderRowActions({
  orderId,
  customerName,
  customerPhone,
  isStorefront = false,
  orderStatus: initialOrderStatus = null,
  currentStage: initialCurrentStage = "BOOKED",
}: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  isStorefront?: boolean;
  orderStatus?: string | null;
  currentStage?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [duePreset, setDuePreset] = useState("24h");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mainTab, setMainTab] = useState("actions");
  const [details, setDetails] = useState<OrderDetailPayload | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [, startDetailsTransition] = useTransition();
  const [callOutcome, setCallOutcome] = useState<string>("OTHER");
  const [storefrontOrderStatus, setStorefrontOrderStatus] = useState<StorefrontOrderStatus>(
    () => parseStorefrontOrderStatus(initialOrderStatus),
  );
  const [shipmentStage, setShipmentStage] = useState<OrderShipmentStageValue>(() =>
    parseShipmentStage(initialCurrentStage),
  );
  const [confirmAddress, setConfirmAddress] = useState<ConfirmAddressValues>(() =>
    emptyConfirmAddress(customerName, customerPhone),
  );

  const isAlreadyConfirmed = isStorefront && isStorefrontOrderConfirmed(storefrontOrderStatus);
  const isAlreadyCancelled = isStorefront && storefrontOrderStatus === "CANCELLED";
  const hideFollowUp = isStorefront && (isAlreadyConfirmed || isAlreadyCancelled);
  const showConfirmAddressFields =
    isStorefront &&
    isStorefrontConfirmOutcome(callOutcome);

  const loadDetails = useCallback(() => {
    setDetailsError(null);
    startDetailsTransition(async () => {
      try {
        const payload = await getOrderDetails(orderId);
        setDetails(payload);
        if (isStorefront) {
          setConfirmAddress(confirmAddressFromDetails(payload));
          setStorefrontOrderStatus(parseStorefrontOrderStatus(payload.orderStatus));
        } else {
          setShipmentStage(parseShipmentStage(payload.currentStage));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load order details.";
        setDetailsError(message);
        toast.error(message);
      }
    });
  }, [orderId, isStorefront]);

  const onDrawerOpenChange = (open: boolean) => {
    setDrawerOpen(open);
    if (open) {
      loadDetails();
    }
    if (!open) {
      setMainTab("actions");
      setDetails(null);
      setDetailsError(null);
      setCallOutcome("OTHER");
      setStorefrontOrderStatus(parseStorefrontOrderStatus(initialOrderStatus));
      setShipmentStage(parseShipmentStage(initialCurrentStage));
      setConfirmAddress(emptyConfirmAddress(customerName, customerPhone));
    }
  };

  const onMainTabChange = (value: string) => {
    setMainTab(value);
    if (value === "order-details" && !details) {
      loadDetails();
    }
  };

  const submitShipmentStage = () => {
    startTransition(async () => {
      try {
        await setOrderStage({ orderId, stage: shipmentStage });
        toast.success("Shipment stage updated.");
        startDetailsTransition(async () => {
          try {
            const payload = await getOrderDetails(orderId);
            setDetails(payload);
            setShipmentStage(parseShipmentStage(payload.currentStage));
          } catch {
            /* ignore refresh errors */
          }
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update stage.");
      }
    });
  };

  const submitCallLog = (formData: FormData) => {
    const outcome = String(formData.get("outcome") ?? "OTHER");
    const notes = String(formData.get("notes") ?? "").trim();
    const refinedAddress = String(formData.get("refinedAddress") ?? "").trim();

    if (isStorefront && isStorefrontConfirmOutcome(outcome)) {
      if (!isConfirmAddressComplete(confirmAddress)) {
        toast.error("Fill in all required shipping address fields for a Called outcome.");
        return;
      }
    }

    startTransition(async () => {
      try {
        const savingConfirmAddress = isStorefront && isStorefrontConfirmOutcome(outcome);

        await logCall({
          orderId,
          outcome,
          notes: notes || undefined,
          refinedAddress: !isStorefront && refinedAddress ? refinedAddress : undefined,
          confirmedAddress: savingConfirmAddress
            ? {
                customerName: confirmAddress.customerName.trim(),
                customerPhone: confirmAddress.customerPhone.trim(),
                addressLine1: confirmAddress.addressLine1.trim(),
                addressLine2: confirmAddress.addressLine2.trim() || undefined,
                addressLine3: confirmAddress.addressLine3.trim() || undefined,
                city: confirmAddress.city.trim(),
                state: confirmAddress.state.trim(),
                postalCode: confirmAddress.postalCode.trim(),
              }
            : undefined,
          orderStatus: isStorefront ? storefrontOrderStatus : undefined,
        });
        toast.success(
          savingConfirmAddress
            ? storefrontOrderStatus === "CONFIRMED"
              ? "Call logged, address saved, order confirmed."
              : "Call logged and address saved."
            : "Call log added.",
        );
        if (details || isStorefront) {
          startDetailsTransition(async () => {
            try {
              setDetails(await getOrderDetails(orderId));
            } catch {
              /* ignore refresh errors */
            }
          });
        }
        if (savingConfirmAddress) {
          setCallOutcome(STOREFRONT_CONFIRM_OUTCOME);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to add call log.");
      }
    });
  };

  const submitFollowUp = (formData: FormData) => {
    const notes = String(formData.get("notes") ?? "").trim();
    const duePresetRaw = String(formData.get("duePreset") ?? "24h").trim();
    const dueAtCustomRaw = String(formData.get("dueAtCustom") ?? "").trim();

    let dueAtIso: string | undefined;
    if (duePresetRaw === "custom") {
      dueAtIso = dueAtCustomRaw ? new Date(dueAtCustomRaw).toISOString() : undefined;
    } else {
      const now = new Date();
      const presetMsMap: Record<string, number> = {
        "1h": 60 * 60 * 1000,
        "2h": 2 * 60 * 60 * 1000,
        "4h": 4 * 60 * 60 * 1000,
        "8h": 8 * 60 * 60 * 1000,
        "12h": 12 * 60 * 60 * 1000,
        "24h": 24 * 60 * 60 * 1000,
        "2d": 2 * 24 * 60 * 60 * 1000,
        "3d": 3 * 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
      };
      const delta = presetMsMap[duePresetRaw];
      dueAtIso = delta ? new Date(now.getTime() + delta).toISOString() : undefined;
    }

    if (!dueAtIso) {
      toast.error("Choose a follow-up due time.");
      return;
    }
    startTransition(async () => {
      try {
        await addFollowUp({
          orderId,
          notes,
          dueAt: dueAtIso,
        });
        toast.success("Follow-up added.");
        if (details) {
          startDetailsTransition(async () => {
            try {
              setDetails(await getOrderDetails(orderId));
            } catch {
              /* ignore refresh errors */
            }
          });
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to add follow-up.");
      }
    });
  };

  const actionsTabLabel = hideFollowUp ? "Call" : "Call & follow-up";

  return (
    <Drawer direction="right" open={drawerOpen} onOpenChange={onDrawerOpenChange}>
      <DrawerTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          aria-label={hideFollowUp ? "Log call" : "Log call and follow-up"}
          title={hideFollowUp ? "Log call" : "Log call and follow-up"}
        >
          <NotebookPenIcon className="size-4" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="flex max-h-[100dvh] flex-col data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-xl">
        <DrawerHeader className="shrink-0 border-b pb-3">
          <DrawerTitle>Row actions</DrawerTitle>
          <div className="mt-1 space-y-0.5 text-left">
            <p className="text-sm font-medium leading-snug text-foreground">{customerName}</p>
            <p className="text-sm text-muted-foreground">{customerPhone}</p>
            {isStorefront && isAlreadyConfirmed ? (
              <p className="text-xs font-medium text-primary">Storefront order confirmed</p>
            ) : null}
          </div>
        </DrawerHeader>
        <Tabs value={mainTab} onValueChange={onMainTabChange} className="flex min-h-0 flex-1 flex-col gap-0 px-4 pb-4">
          <TabsList className="mt-3 w-full shrink-0 justify-start">
            <TabsTrigger value="actions">{actionsTabLabel}</TabsTrigger>
            <TabsTrigger value="order-details">Order details</TabsTrigger>
          </TabsList>
          <TabsContent value="actions" className="mt-4 min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-6">
              {!isStorefront ? (
                <section className="space-y-3 rounded-md border border-dashed p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">Shipment stage</p>
                    <ShipmentStageBadge stage={shipmentStage} size="compact" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor={`shipment-stage-${orderId}`} className="text-sm font-medium">
                      Update stage
                    </label>
                    <select
                      id={`shipment-stage-${orderId}`}
                      value={shipmentStage}
                      disabled={pending}
                      onChange={(e) => setShipmentStage(parseShipmentStage(e.target.value))}
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-60"
                    >
                      {ORDER_SHIPMENT_STAGE_VALUES.map((stage) => (
                        <option key={stage} value={stage}>
                          {shipmentStageSelectLabel(stage)}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Manual update — does not sync India Post tracking.
                    </p>
                  </div>
                  <Button type="button" variant="secondary" disabled={pending} onClick={submitShipmentStage}>
                    Save stage
                  </Button>
                </section>
              ) : null}

              <section className="space-y-3">
                <p className="text-sm font-medium">Add call log</p>
                {isStorefront && isAlreadyConfirmed ? (
                  <p className="text-sm text-muted-foreground">
                    This order is already confirmed. You can still log another call outcome if needed.
                  </p>
                ) : null}
                <form action={submitCallLog} className="space-y-3">
                  <div className="space-y-2">
                    <label htmlFor={`outcome-${orderId}`} className="text-sm font-medium">
                      Outcome
                    </label>
                    <select
                      id={`outcome-${orderId}`}
                      name="outcome"
                      value={callOutcome}
                      onChange={(e) => setCallOutcome(e.target.value)}
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      {CALL_OUTCOME_VALUES.map((outcome) => (
                        <option key={outcome} value={outcome}>
                          {CALL_OUTCOME_LABELS[outcome]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor={`call-notes-${orderId}`} className="text-sm font-medium">
                      Notes
                    </label>
                    <Input id={`call-notes-${orderId}`} name="notes" placeholder="Call notes" />
                  </div>

                  {isStorefront ? (
                    <div className="space-y-2">
                      <label htmlFor={`order-status-${orderId}`} className="text-sm font-medium">
                        Order status
                      </label>
                      <select
                        id={`order-status-${orderId}`}
                        value={storefrontOrderStatus}
                        disabled={pending}
                        onChange={(e) =>
                          setStorefrontOrderStatus(
                            parseStorefrontOrderStatus(e.target.value),
                          )
                        }
                        className="h-9 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-60"
                      >
                        {STOREFRONT_ORDER_STATUS_VALUES.map((status) => (
                          <option key={status} value={status}>
                            {STOREFRONT_ORDER_STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Independent of call outcome — set Pending, Confirmed, or Cancelled as appropriate.
                      </p>
                    </div>
                  ) : null}

                  {showConfirmAddressFields ? (
                    <ConfirmAddressFields
                      idPrefix={orderId}
                      values={confirmAddress}
                      onChange={(field, value) =>
                        setConfirmAddress((prev) => ({ ...prev, [field]: value }))
                      }
                      disabled={pending}
                    />
                  ) : null}

                  {!isStorefront ? (
                    <div className="space-y-2">
                      <label htmlFor={`refined-address-${orderId}`} className="text-sm font-medium">
                        Refined address
                      </label>
                      <Textarea
                        id={`refined-address-${orderId}`}
                        name="refinedAddress"
                        placeholder="Corrected or clarified full address (optional)"
                        maxLength={8000}
                        rows={4}
                        className="min-h-[100px]"
                      />
                      <p className="text-xs text-muted-foreground">
                        Saved on the order when you submit this call log (does not change the import address).
                      </p>
                    </div>
                  ) : null}

                  <Button type="submit" disabled={pending}>
                    {isStorefrontConfirmOutcome(callOutcome) && isStorefront
                      ? "Save call log & address"
                      : "Save call log"}
                  </Button>
                </form>
              </section>

              {!hideFollowUp ? (
                <section className="space-y-3 border-t pt-4">
                  <p className="text-sm font-medium">Add follow-up</p>
                  <form action={submitFollowUp} className="space-y-3">
                    <div className="space-y-2">
                      <label htmlFor={`follow-notes-${orderId}`} className="text-sm font-medium">
                        Follow-up notes
                      </label>
                      <Input id={`follow-notes-${orderId}`} name="notes" required placeholder="What is the next step?" />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor={`follow-due-preset-${orderId}`} className="text-sm font-medium">
                        Due in
                      </label>
                      <select
                        id={`follow-due-preset-${orderId}`}
                        name="duePreset"
                        defaultValue="24h"
                        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                        onChange={(e) => setDuePreset(e.target.value)}
                      >
                        <option value="1h">1 hour</option>
                        <option value="2h">2 hours</option>
                        <option value="4h">4 hours</option>
                        <option value="8h">8 hours</option>
                        <option value="12h">12 hours</option>
                        <option value="24h">24 hours</option>
                        <option value="2d">2 days</option>
                        <option value="3d">3 days</option>
                        <option value="7d">7 days</option>
                        <option value="custom">Custom date & time</option>
                      </select>
                    </div>
                    {duePreset === "custom" ? (
                      <div className="space-y-2">
                        <label htmlFor={`follow-due-custom-${orderId}`} className="text-sm font-medium">
                          Custom due at
                        </label>
                        <input
                          id={`follow-due-custom-${orderId}`}
                          name="dueAtCustom"
                          type="datetime-local"
                          step="60"
                          required
                          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                          onFocus={(e) => {
                            if ("showPicker" in e.currentTarget) {
                              (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
                            }
                          }}
                        />
                      </div>
                    ) : null}
                    <Button type="submit" disabled={pending}>
                      Save follow-up
                    </Button>
                  </form>
                </section>
              ) : isStorefront && isAlreadyConfirmed ? (
                <p className="border-t pt-4 text-sm text-muted-foreground">
                  This storefront order is confirmed — follow-up is not required.
                </p>
              ) : null}
            </div>
          </TabsContent>
          <TabsContent value="order-details" className="mt-4 min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            {details ? (
              <OrderDetailTabs details={details} />
            ) : detailsError ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive">{detailsError}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => loadDetails()}>
                  Retry
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading order details...</p>
            )}
          </TabsContent>
        </Tabs>
      </DrawerContent>
    </Drawer>
  );
}

