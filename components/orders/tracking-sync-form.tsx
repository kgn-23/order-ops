"use client";

import { useActionState, useEffect, useState } from "react";
import {
  type IndiaPostSyncFormState,
  syncTrackingFromIndiaPostFormAction,
} from "@/app/actions/phase1";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OrderOption = {
  id: string;
  customerName: string;
};

const initialState: IndiaPostSyncFormState = { status: "idle" };

export function TrackingSyncForm({ orders }: { orders: OrderOption[] }) {
  const [orderId, setOrderId] = useState(orders[0]?.id ?? "");
  const [state, formAction, isPending] = useActionState(
    syncTrackingFromIndiaPostFormAction,
    initialState,
  );

  useEffect(() => {
    if (orders.length === 0) return;
    if (!orderId || !orders.some((o) => o.id === orderId)) {
      setOrderId(orders[0].id);
    }
  }, [orders, orderId]);

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tracking Sync (India Post API)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No orders available. Upload or assign orders before syncing tracking.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tracking Sync (India Post API)</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="orderId" value={orderId} />
          <div className="space-y-2">
            <Select value={orderId} onValueChange={setOrderId} disabled={isPending}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select order" />
              </SelectTrigger>
              <SelectContent>
                {orders.map((order) => (
                  <SelectItem key={order.id} value={order.id}>
                    {order.customerName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Provider</span>
              <Badge variant="secondary">INDIA_POST</Badge>
            </div>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Fetching…" : "Fetch Latest Status"}
          </Button>
          {state.status === "error" ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          {state.status === "success" ? (
            <p className="text-sm text-muted-foreground">
              Updated to <span className="font-medium text-foreground">{state.stage}</span>
              {state.externalStatus ? (
                <>
                  {" "}
                  — <span className="text-foreground">{state.externalStatus}</span>
                </>
              ) : null}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
