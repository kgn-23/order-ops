"use client";

import { useEffect, useState, useTransition } from "react";
import { DownloadIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { exportCodOrders, getCodExportPreview } from "@/lib/orders/actions/export";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type CodExportSheetProps = {
  initialReadyCount: number;
  readyListHref: string;
};

function downloadBase64File(fileBase64: string, fileName: string) {
  const bytes = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function CodExportSheet({ initialReadyCount, readyListHref }: CodExportSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [readyCount, setReadyCount] = useState(initialReadyCount);
  const [preview, setPreview] = useState<
    Awaited<ReturnType<typeof getCodExportPreview>>["preview"]
  >([]);

  useEffect(() => {
    setReadyCount(initialReadyCount);
  }, [initialReadyCount]);

  useEffect(() => {
    if (!open) return;
    startTransition(async () => {
      try {
        const data = await getCodExportPreview();
        setReadyCount(data.readyCount);
        setPreview(data.preview);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load export queue.");
      }
    });
  }, [open]);

  const runExport = () => {
    startTransition(async () => {
      try {
        const result = await exportCodOrders({});
        downloadBase64File(result.fileBase64, result.fileName);
        toast.success(
          `Exported ${result.orderCount} order(s). Batch ${result.batchId.slice(-8).toUpperCase()}.`,
        );
        setReadyCount(Math.max(0, readyCount - result.orderCount));
        setOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Export failed.");
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="default" className="shrink-0">
          <DownloadIcon className="mr-2 size-4" />
          Export COD
          {readyCount > 0 ? (
            <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-[10px]">
              {readyCount}
            </Badge>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Export COD file</SheetTitle>
          <SheetDescription>
            Download confirmed storefront orders in India Post COD FILE 4 format. Exported orders
            are marked so they cannot be exported again.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-8 pt-4">
          <div className="rounded-md border bg-muted/40 p-3">
            <p className="text-sm font-medium">Ready to export</p>
            <p className="text-2xl font-semibold tabular-nums">{readyCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Confirmed orders with complete address, not yet exported.
            </p>
          </div>

          {preview.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Next in queue</p>
              <ul className="space-y-1.5 text-sm">
                {preview.map((row) => (
                  <li key={row.id} className="rounded-md border px-2 py-1.5">
                    <p className="font-medium">{row.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.merchantOrderDisplayName ?? "—"} · {row.city}
                      {row.totalAmount != null ? ` · ₹${Number(row.totalAmount).toFixed(0)}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-auto flex flex-col gap-2 border-t pt-4">
            <Button type="button" disabled={pending || readyCount === 0} onClick={runExport}>
              Download {readyCount > 0 ? `${readyCount} orders` : "COD file"}
            </Button>
            <Button type="button" variant="outline" asChild disabled={pending}>
              <a href={readyListHref}>View ready orders in list</a>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
