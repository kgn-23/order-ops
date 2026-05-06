"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { toast } from "sonner";

import { createOrdersAndAssignFromRowsForm } from "@/app/actions/phase1";
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
  city: string;
  state: string;
  postalCode: string;
};

const FIELD_MAP: Record<string, keyof ParsedOrderRow> = {
  customername: "customerName",
  customer_name: "customerName",
  phone: "customerPhone",
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
  receivercity: "city",
  "receiverstate/ut": "state",
  receiverpincode: "postalCode",
};

function normalizeKey(key: string) {
  return key.replace(/\s+/g, "").toLowerCase();
}

function normalizeRow(input: Record<string, unknown>) {
  const normalized: Partial<ParsedOrderRow> = {};
  for (const [key, value] of Object.entries(input)) {
    const mapped = FIELD_MAP[normalizeKey(key)];
    if (!mapped) continue;
    normalized[mapped] = typeof value === "string" ? value.trim() : String(value ?? "");
  }
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
      city: row.city?.trim() || "",
      state: row.state?.trim() || "",
      postalCode: row.postalCode?.trim() || "",
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

export function AdminBulkUploadSheet({ callers }: { callers: CallerOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedOrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedCallerId, setSelectedCallerId] = useState<string>(callers[0]?.id ?? "");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (callers.length === 0) {
      setSelectedCallerId("");
      return;
    }
    setSelectedCallerId((prev) => (callers.some((c) => c.id === prev) ? prev : callers[0].id));
  }, [callers]);

  const preview = useMemo(() => rows.slice(0, 5), [rows]);

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
      const mappedRows = sanitizeRows(jsonRows.map(normalizeRow));
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    startTransition(async () => {
      try {
        const formData = new FormData(form);
        await createOrdersAndAssignFromRowsForm(formData);
        toast.success("Orders created and assigned.");
        setRows([]);
        setError(null);
        setOpen(false);
        router.refresh();
      } catch (e) {
        const message = e instanceof Error ? e.message : "Upload failed.";
        setError(message);
        toast.error(message);
      }
    });
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Bulk upload & assign
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="border-b p-4 text-left">
            <SheetTitle>Bulk upload & assign</SheetTitle>
            <SheetDescription>
              Upload CSV/XLSX, pick an assignee, preview up to 5 rows, then create orders and
              assign them.
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
              />
              <label
                htmlFor="bulk-upload-sheet-file"
                className="inline-flex w-fit cursor-pointer rounded-lg border px-3 py-2 text-sm"
              >
                Choose CSV/XLSX file
              </label>

              <div className="space-y-2">
                <Label htmlFor="bulk-assignee-sheet">Assign to</Label>
                <Select
                  value={selectedCallerId || undefined}
                  onValueChange={setSelectedCallerId}
                  disabled={callers.length === 0}
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
                <input type="hidden" name="assigneeId" value={selectedCallerId} />
              </div>

              <input type="hidden" name="rowsJson" value={JSON.stringify(rows)} />

              <Input
                readOnly
                value={rows.length > 0 ? `${rows.length} valid rows ready` : "No valid rows parsed yet"}
              />

              <Button disabled={pending || rows.length === 0 || !selectedCallerId} type="submit">
                {pending ? "Working…" : "Upload and assign"}
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
    </>
  );
}
