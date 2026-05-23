"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import type { ActivityLogSort, ActivityUrlState } from "@/lib/activity-params";
import { ACTIVITY_LOG_SORTS, activitySearchParamsString } from "@/lib/activity-params";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ActivityLogPageRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor: { name: string } | null;
  order: { customerName: string; trackingNumber: string | null } | null;
};

const SORT_LABELS: Record<ActivityLogSort, string> = {
  createdAt_desc: "Date (newest first)",
  createdAt_asc: "Date (oldest first)",
  action_asc: "Action A–Z",
  action_desc: "Action Z–A",
  entityType_asc: "Entity type A–Z",
  entityType_desc: "Entity type Z–A",
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function ActivityLogsView({
  basePath,
  rows,
  total,
  applied,
}: {
  basePath: string;
  rows: ActivityLogPageRow[];
  total: number;
  applied: ActivityUrlState;
}) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<ActivityUrlState>(applied);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setSheetOpen(open);
      if (open) setDraft(applied);
    },
    [applied],
  );

  const totalPages = Math.max(1, Math.ceil(total / applied.pageSize));

  function hrefForPage(page: number) {
    const q = activitySearchParamsString({ ...applied, page });
    return `${basePath}?${q}`;
  }

  function applyFilters() {
    const next: ActivityUrlState = {
      ...draft,
      page: 1,
    };
    router.push(`${basePath}?${activitySearchParamsString(next)}`);
    setSheetOpen(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity log</CardTitle>
        <CardAction>
          <Button type="button" variant="outline" size="sm" onClick={() => handleOpenChange(true)}>
            Filter &amp; sort
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {total === 0 ? "No entries" : `${total} entr${total === 1 ? "y" : "ies"}`} · Page{" "}
            {applied.page} of {totalPages}
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Actor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No activity matches the current filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatWhen(row.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium">{row.action}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <Badge variant="outline" className="w-fit">
                        {row.entityType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{row.entityId}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.order ? (
                      <div className="flex flex-col gap-0.5">
                        <span>{row.order.customerName}</span>
                        <span className="text-xs text-muted-foreground">
                          {row.order.trackingNumber ?? "—"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{row.actor?.name ?? "System"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <Button variant="outline" size="sm" disabled={applied.page <= 1} asChild>
            <Link href={hrefForPage(applied.page - 1)}>Previous</Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {applied.page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={applied.page >= totalPages} asChild>
            <Link href={hrefForPage(applied.page + 1)}>Next</Link>
          </Button>
        </div>
      </CardContent>

      <Sheet open={sheetOpen} onOpenChange={handleOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <SheetHeader className="border-b p-4 text-left">
            <SheetTitle>Filter &amp; sort</SheetTitle>
            <SheetDescription>
              Adjust options and click Apply. The table updates only after Apply (pagination uses
              separate controls).
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            <div className="space-y-2">
              <Label htmlFor="act-action">Action contains</Label>
              <Input
                id="act-action"
                value={draft.action}
                onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value }))}
                placeholder="e.g. ORDER_ASSIGNED"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="act-entity">Entity type contains</Label>
              <Input
                id="act-entity"
                value={draft.entityType}
                onChange={(e) => setDraft((d) => ({ ...d, entityType: e.target.value }))}
                placeholder="e.g. Order"
              />
            </div>
            <div className="space-y-2">
              <Label>Sort by</Label>
              <Select
                value={draft.sort}
                onValueChange={(v) => setDraft((d) => ({ ...d, sort: v as ActivityLogSort }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_LOG_SORTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SORT_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rows per page</Label>
              <Select
                value={String(draft.pageSize)}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, pageSize: parseInt(v, 10) || 20 }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t p-4">
            <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={applyFilters}>
              Apply
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
