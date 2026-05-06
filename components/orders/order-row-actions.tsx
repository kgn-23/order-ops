"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { addFollowUp, logCall } from "@/app/actions/phase1";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";

const CALL_OUTCOMES = [
  "NO_ANSWER",
  "CALLBACK_REQUESTED",
  "CONFIRMED",
  "DELAYED",
  "CANCELLED",
  "INVALID_NUMBER",
  "OTHER",
] as const;

export function OrderRowActions({ orderId, customerName }: { orderId: string; customerName: string }) {
  const [pending, startTransition] = useTransition();
  const [duePreset, setDuePreset] = useState("24h");

  const submitCallLog = (formData: FormData) => {
    const outcome = String(formData.get("outcome") ?? "OTHER");
    const notes = String(formData.get("notes") ?? "").trim();
    startTransition(async () => {
      try {
        await logCall({
          orderId,
          outcome,
          notes: notes || undefined,
        });
        toast.success("Call log added.");
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
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to add follow-up.");
      }
    });
  };

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Log / Follow-up
        </Button>
      </DrawerTrigger>
      <DrawerContent className="data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-md">
        <DrawerHeader>
          <DrawerTitle>Row actions</DrawerTitle>
          <DrawerDescription>{customerName}</DrawerDescription>
        </DrawerHeader>
        <div className="space-y-6 p-4">
          <section className="space-y-3">
            <p className="text-sm font-medium">Add call log</p>
            <form action={submitCallLog} className="space-y-3">
              <div className="space-y-2">
                <label htmlFor={`outcome-${orderId}`} className="text-sm font-medium">
                  Outcome
                </label>
                <select
                  id={`outcome-${orderId}`}
                  name="outcome"
                  defaultValue="OTHER"
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {CALL_OUTCOMES.map((outcome) => (
                    <option key={outcome} value={outcome}>
                      {outcome}
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
              <Button type="submit" disabled={pending}>
                Save call log
              </Button>
            </form>
          </section>

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
        </div>
      </DrawerContent>
    </Drawer>
  );
}
