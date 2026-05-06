"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { getOrderDetails, type OrderDetailPayload } from "@/app/actions/order-details";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { XIcon } from "lucide-react";

function fmt(iso: string) {
  return new Date(iso).toLocaleString();
}

export function OrderDetailsDrawer({ orderId, customerName }: { orderId: string; customerName: string }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [details, setDetails] = useState<OrderDetailPayload | null>(null);

  const onOpenChange = (next: boolean) => {
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

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          View
        </Button>
      </DrawerTrigger>
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
        <div className="h-[calc(100vh-76px)] overflow-auto p-4">
          {pending && !details ? (
            <p className="text-sm text-muted-foreground">Loading order details...</p>
          ) : details ? (
            <Tabs defaultValue="details" className="gap-4">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="attempts">Attempts</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="followups">Follow-ups</TabsTrigger>
                <TabsTrigger value="assignments">Assignments</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Order ID:</span> {details.id}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Created:</span> {fmt(details.createdAt)}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Tracking:</span> {details.trackingNumber ?? "—"}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Stage:</span> <Badge variant="outline">{details.currentStage}</Badge>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Source:</span> {details.sourceSystem}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Source Order ID:</span> {details.sourceOrderId ?? "—"}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="mb-1 text-sm font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">
                    {details.addressLine1}
                    {details.addressLine2 ? `, ${details.addressLine2}` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {details.city}, {details.state} {details.postalCode}, {details.country}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="attempts" className="space-y-2">
                {details.attempts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No call attempts yet.</p>
                ) : (
                  details.attempts.map((a) => (
                    <div key={a.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{a.outcome}</Badge>
                        <span className="text-xs text-muted-foreground">{fmt(a.calledAt)}</span>
                        <span className="text-xs text-muted-foreground">by {a.callerName}</span>
                      </div>
                      {a.notes ? <p className="mt-2 text-sm">{a.notes}</p> : null}
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="timeline" className="space-y-2">
                {details.statusTimeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No status events yet.</p>
                ) : (
                  details.statusTimeline.map((t) => (
                    <div key={t.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{t.stage}</Badge>
                        <span className="text-xs text-muted-foreground">{t.provider}</span>
                        <span className="text-xs text-muted-foreground">{fmt(t.eventAt)}</span>
                      </div>
                      <p className="mt-2 text-sm">{t.externalStatus}</p>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="followups" className="space-y-2">
                {details.followUps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No follow-ups yet.</p>
                ) : (
                  details.followUps.map((f) => (
                    <div key={f.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={f.isClosed ? "secondary" : "outline"}>{f.isClosed ? "Closed" : "Open"}</Badge>
                        <span className="text-xs text-muted-foreground">by {f.createdByName}</span>
                        <span className="text-xs text-muted-foreground">{fmt(f.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm">{f.notes}</p>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="assignments" className="space-y-2">
                {details.assignmentHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assignment history.</p>
                ) : (
                  details.assignmentHistory.map((a) => (
                    <div key={a.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={a.isActive ? "outline" : "secondary"}>{a.isActive ? "Active" : "Inactive"}</Badge>
                        <span className="text-xs text-muted-foreground">{a.assignmentType}</span>
                        <span className="text-xs text-muted-foreground">{fmt(a.assignedAt)}</span>
                      </div>
                      <p className="mt-2 text-sm">
                        {a.assigneeName} assigned by {a.assignedByName}
                      </p>
                      {a.reason ? <p className="text-sm text-muted-foreground">{a.reason}</p> : null}
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <p className="text-sm text-muted-foreground">Open the panel to load order details.</p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
