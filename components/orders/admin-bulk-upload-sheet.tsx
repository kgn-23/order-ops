"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { toast } from "sonner";

import { finishBulkUpload, processBulkUploadBatch } from "@/lib/orders/actions/upload";
import { chunk, UPLOAD_BATCH_SIZE } from "@/lib/orders/upload-batch";
import { enrichOrderRowFromMerchantNotes } from "@/lib/orders/parse-merchant-notes";
import type { BulkUploadListContext } from "@/lib/orders/upload-source";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type CallerOption = {
  id: string;
  name: string;
  email: string;
  roles?: { role: { code: string } }[];
};

function assigneeLabel(c: CallerOption) {
  const codes = (c.roles ?? [])
    .map((r) => r.role.code)
    .filter((code) => code === "MANAGER" || code === "CALLER");
  const tag = codes.length ? ` · ${codes.join(" + ")}` : "";
  return `${c.name} (${c.email})${tag}`;
}

type ParsedOrderRow = {
  externalOrderId?: string;
  trackingNumber?: string;
  customerName: string;
  customerPhone: string;
  addressLine1: string;
  addressLine2?: string;
  addressLine3?: string;
  city: string;
  state: string;
  postalCode: string;
  merchantOrderDisplayName?: string;
  merchantOrderCreatedAt?: string;
  financialStatus?: string;
  fulfillmentStatus?: string;
  currencyCode?: string;
  subtotalAmount?: number;
  shippingAmount?: number;
  taxesAmount?: number;
  totalAmount?: number;
  discountAmount?: number;
  paymentMethod?: string;
  paymentReference?: string;
  shippingMethodLabel?: string;
  merchantOrderNotes?: string;
  orderTags?: string;
  primaryVendor?: string;
  orderChannel?: string;
  riskLevel?: string;
  lineItemTitle?: string;
  lineItemSku?: string;
  lineItemQuantity?: number;
  lineItemUnitPrice?: number;
};

const FIELD_MAP: Record<string, keyof ParsedOrderRow | "altPhone"> = {
  customername: "customerName",
  customer_name: "customerName",
  phone: "altPhone",
  mobile: "customerPhone",
  customerphone: "customerPhone",
  address1: "addressLine1",
  addressline1: "addressLine1",
  address2: "addressLine2",
  addressline2: "addressLine2",
  city: "city",
  state: "state",
  pincode: "postalCode",
  postalcode: "postalCode",
  tracking: "trackingNumber",
  trackingnumber: "trackingNumber",
  orderid: "externalOrderId",
  externalorderid: "externalOrderId",
  barcodeno: "trackingNumber",
  receivername: "customerName",
  receivermobileno: "customerPhone",
  receiveraddline1: "addressLine1",
  receiveraddline2: "addressLine2",
  receiveraddline3: "addressLine3",
  receivercity: "city",
  "receiverstate/ut": "state",
  receiverpincode: "postalCode",
  name: "merchantOrderDisplayName",
  id: "externalOrderId",
  financialstatus: "financialStatus",
  fulfillmentstatus: "fulfillmentStatus",
  currency: "currencyCode",
  subtotal: "subtotalAmount",
  shipping: "shippingAmount",
  taxes: "taxesAmount",
  total: "totalAmount",
  discountamount: "discountAmount",
  paymentmethod: "paymentMethod",
  paymentreference: "paymentReference",
  shippingmethod: "shippingMethodLabel",
  notes: "merchantOrderNotes",
  tags: "orderTags",
  vendor: "primaryVendor",
  source: "orderChannel",
  risklevel: "riskLevel",
  createdat: "merchantOrderCreatedAt",
  shippingname: "customerName",
  shippingphone: "customerPhone",
  shippingaddress1: "addressLine1",
  shippingaddress2: "addressLine2",
  shippingcity: "city",
  shippingprovince: "state",
  shippingzip: "postalCode",
  lineitemquantity: "lineItemQuantity",
  lineitemname: "lineItemTitle",
  lineitemprice: "lineItemUnitPrice",
  lineitemsku: "lineItemSku",
};

function normalizeKey(key: string) {
  return key.replace(/\s+/g, "").toLowerCase();
}

function coerceMoney(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const s = String(value).trim().replace(/,/g, "");
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function coerceInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

function normalizeRow(input: Record<string, unknown>) {
  const normalized: Partial<ParsedOrderRow> & { altPhone?: string } = {};
  for (const [key, value] of Object.entries(input)) {
    const mapped = FIELD_MAP[normalizeKey(key)];
    if (!mapped) continue;
    if (
      mapped === "subtotalAmount" ||
      mapped === "shippingAmount" ||
      mapped === "taxesAmount" ||
      mapped === "totalAmount" ||
      mapped === "discountAmount" ||
      mapped === "lineItemUnitPrice"
    ) {
      const n = coerceMoney(value);
      if (n !== undefined) normalized[mapped] = n as ParsedOrderRow[typeof mapped];
      continue;
    }
    if (mapped === "lineItemQuantity") {
      const n = coerceInt(value);
      if (n !== undefined && n > 0) normalized.lineItemQuantity = n;
      continue;
    }
    const str = typeof value === "string" ? value.trim() : String(value ?? "").trim();
    if (mapped === "altPhone") {
      normalized.altPhone = str;
      continue;
    }
    (normalized as Record<string, unknown>)[mapped] = str;
  }
  const alt = normalized.altPhone?.trim();
  if (!normalized.customerPhone?.trim() && alt) {
    normalized.customerPhone = alt;
  }
  delete normalized.altPhone;
  return normalized;
}

function sanitizeRows(rows: Partial<ParsedOrderRow>[]) {
  return rows
    .map((row) => ({
      externalOrderId: row.externalOrderId || undefined,
      trackingNumber: row.trackingNumber || undefined,
      customerName: row.customerName?.trim() || "",
      customerPhone: row.customerPhone?.trim() || "",
      addressLine1: row.addressLine1?.trim() || "",
      addressLine2: row.addressLine2?.trim() || undefined,
      addressLine3: row.addressLine3?.trim() || undefined,
      city: row.city?.trim() || "",
      state: row.state?.trim() || "",
      postalCode: row.postalCode?.trim() || "",
      merchantOrderDisplayName: row.merchantOrderDisplayName?.trim() || undefined,
      merchantOrderCreatedAt: row.merchantOrderCreatedAt?.trim() || undefined,
      financialStatus: row.financialStatus?.trim() || undefined,
      fulfillmentStatus: row.fulfillmentStatus?.trim() || undefined,
      currencyCode: row.currencyCode?.trim() || undefined,
      subtotalAmount: row.subtotalAmount,
      shippingAmount: row.shippingAmount,
      taxesAmount: row.taxesAmount,
      totalAmount: row.totalAmount,
      discountAmount: row.discountAmount,
      paymentMethod: row.paymentMethod?.trim() || undefined,
      paymentReference: row.paymentReference?.trim() || undefined,
      shippingMethodLabel: row.shippingMethodLabel?.trim() || undefined,
      merchantOrderNotes: row.merchantOrderNotes?.trim() || undefined,
      orderTags: row.orderTags?.trim() || undefined,
      primaryVendor: row.primaryVendor?.trim() || undefined,
      orderChannel: row.orderChannel?.trim() || undefined,
      riskLevel: row.riskLevel?.trim() || undefined,
      lineItemTitle: row.lineItemTitle?.trim() || undefined,
      lineItemSku: row.lineItemSku?.trim() || undefined,
      lineItemQuantity: row.lineItemQuantity,
      lineItemUnitPrice: row.lineItemUnitPrice,
    }))
    .filter(
      (row) =>
        row.customerName &&
        row.customerPhone &&
        row.addressLine1 &&
        row.city &&
        row.state &&
        row.postalCode,
    );
}

type AdminBulkUploadSheetProps = {
  callers: CallerOption[];
  /** Set from the page: tracking orders list vs storefront orders list. */
  listContext: BulkUploadListContext;
};

export function AdminBulkUploadSheet({ callers, listContext }: AdminBulkUploadSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedOrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedCallerId, setSelectedCallerId] = useState<string>(callers[0]?.id ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ processed: number; total: number } | null>(
    null,
  );

  const effectiveCallerId =
    callers.length === 0
      ? ""
      : callers.some((c) => c.id === selectedCallerId)
        ? selectedCallerId
        : callers[0].id;

  const preview = useMemo(() => rows.slice(0, 5), [rows]);

  const importLabel =
    listContext === "storefront" ? "storefront orders" : "tracking / carrier orders";

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const bytes = await file.arrayBuffer();
      const workbook = XLSX.read(bytes, { type: "array" });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) {
        setRows([]);
        setError("No sheet found in the uploaded file.");
        return;
      }

      const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        workbook.Sheets[firstSheet],
        { defval: "" },
      );
      const mappedRows = sanitizeRows(
        jsonRows.map((row) =>
          enrichOrderRowFromMerchantNotes(normalizeRow(row) as Record<string, unknown>) as Partial<ParsedOrderRow>,
        ),
      );
      if (mappedRows.length === 0) {
        setRows([]);
        setError("No valid order rows found. Check column headers and required values.");
        return;
      }

      setRows(mappedRows);
      setError(null);
    } catch {
      setRows([]);
      setError("Unable to parse file. Upload CSV/XLS/XLSX with valid headers.");
    }
  }

  const uploadPercent =
    uploadProgress && uploadProgress.total > 0
      ? Math.min(100, Math.round((uploadProgress.processed / uploadProgress.total) * 100))
      : 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!effectiveCallerId || rows.length === 0) return;

    const batches = chunk(rows, UPLOAD_BATCH_SIZE);
    setIsUploading(true);
    setUploadProgress({ processed: 0, total: rows.length });
    setError(null);

    void (async () => {
      try {
        let processed = 0;
        for (const batch of batches) {
          await processBulkUploadBatch({
            rows: batch,
            assigneeId: effectiveCallerId,
            listContext,
          });
          processed += batch.length;
          setUploadProgress({ processed, total: rows.length });
        }
        await finishBulkUpload();
        toast.success(`${rows.length} order${rows.length === 1 ? "" : "s"} created and assigned.`);
        setRows([]);
        setError(null);
        setOpen(false);
        router.refresh();
      } catch (e) {
        const message = e instanceof Error ? e.message : "Upload failed.";
        setError(message);
        toast.error(message);
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
      }
    })();
  }

  function handleOpenChange(next: boolean) {
    if (isUploading && !next) return;
    setOpen(next);
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Bulk upload & assign
      </Button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="border-b p-4 text-left">
            <SheetTitle>Bulk upload & assign</SheetTitle>
            <SheetDescription>
              Imports on this page are saved as {importLabel}. Pick an assignee, preview up to 5
              rows, then create and assign.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border p-3">
              <Badge variant="outline" className="w-fit">
                Preview limit: 5 rows
              </Badge>

              <input
                accept=".csv,.xls,.xlsx"
                onChange={onFileChange}
                type="file"
                className="hidden"
                id="bulk-upload-sheet-file"
                disabled={isUploading}
              />
              <label
                htmlFor="bulk-upload-sheet-file"
                className={`inline-flex w-fit rounded-lg border px-3 py-2 text-sm ${isUploading ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
              >
                Choose CSV/XLSX file
              </label>

              {rows.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {rows.length} row{rows.length === 1 ? "" : "s"} → {importLabel}
                </p>
              ) : null}

              <input type="hidden" name="uploadListContext" value={listContext} />

              {uploadProgress ? (
                <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Uploading…</span>
                    <span className="text-muted-foreground">
                      {uploadProgress.processed} / {uploadProgress.total} ({uploadPercent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-300"
                      style={{ width: `${uploadPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Processing in batches of {UPLOAD_BATCH_SIZE} rows — keep this tab open.
                  </p>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="bulk-assignee-sheet">Assign to</Label>
                <Select
                  value={effectiveCallerId || undefined}
                  onValueChange={setSelectedCallerId}
                  disabled={callers.length === 0 || isUploading}
                >
                  <SelectTrigger id="bulk-assignee-sheet" className="w-full">
                    <SelectValue
                      placeholder={
                        callers.length === 0 ? "No assignees available" : "Select assignee"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent position="popper" className="w-(--radix-select-trigger-width) max-h-72">
                    {callers.map((caller) => (
                      <SelectItem key={caller.id} value={caller.id}>
                        {assigneeLabel(caller)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="assigneeId" value={effectiveCallerId} />
              </div>

              <Input
                readOnly
                value={rows.length > 0 ? `${rows.length} valid rows ready` : "No valid rows parsed yet"}
              />

              <Button disabled={isUploading || rows.length === 0 || !effectiveCallerId} type="submit">
                {isUploading
                  ? `Uploading… ${uploadProgress ? `${uploadProgress.processed}/${uploadProgress.total}` : ""}`
                  : "Upload and assign"}
              </Button>
            </form>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            {preview.length > 0 ? (
              <div className="rounded-lg border p-3">
                <p className="mb-3 text-sm font-medium">
                  Preview (top {preview.length} of {rows.length})
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Pincode</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row, index) => (
                      <TableRow key={`${row.trackingNumber ?? "row"}-${index}`}>
                        <TableCell>{row.trackingNumber ?? "—"}</TableCell>
                        <TableCell>{row.customerName}</TableCell>
                        <TableCell>{row.customerPhone}</TableCell>
                        <TableCell>{row.city}</TableCell>
                        <TableCell>{row.postalCode}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
