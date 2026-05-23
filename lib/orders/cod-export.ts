import * as XLSX from "xlsx";

import type { CodArticleDefaults, CodSenderProfile } from "@/lib/orders/cod-export-config";
import { getCodArticleDefaults, getCodSenderProfile } from "@/lib/orders/cod-export-config";
import { normalizePhone } from "@/lib/orders/actions/shared";

/** Header row from `docs/COD FILE 4.xlsx` (ArticleDetails sheet). */
export const COD_FILE_4_HEADERS = [
  "SERIAL NUMBER",
  "BARCODE NO",
  "PHYSICAL WEIGHT",
  "RECEIVER CITY",
  "RECEIVER PINCODE",
  "RECEIVER NAME",
  "RECEIVER ADD LINE 1",
  "RECEIVER ADD LINE 2",
  "RECEIVER ADD LINE 3",
  "ACK",
  "SENDER MOBILE NO",
  "RECEIVER MOBILE NO",
  "PREPAYMENT CODE",
  "VALUE OF PREPAYMENT",
  "CODR/COD",
  "VALUE FOR CODR/COD",
  "INSURANCE TYPE",
  "VALUE OF INSURANCE",
  "SHAPE OF ARTICLE",
  "LENGTH ",
  "BREADTH/DIAMETER",
  "HEIGHT",
  "PRIORITY FLAG",
  "DELIVERY INSTRUCTION",
  "DELIVERY SLOT",
  "INSTRUCTION RTS",
  "SENDER NAME",
  "SENDER COMPANY NAME",
  "SENDER CITY",
  "SENDER STATE/UT",
  "SENDER PINCODE",
  "SENDER EMAILID",
  "SENDER ALT CONTACT",
  "SENDER KYC",
  "SENDER TAX",
  "RECEIVER COMPANY NAME",
  "RECEIVER STATE/UT",
  "RECEIVER EMAILID",
  "RECEIVER ALT CONTACT",
  "RECEIVER KYC",
  "RECEIVER TAX REF",
  "ALT ADDRESS FLAG",
  "BULK REFERENCE",
  "SENDER ADD LINE 1",
  "SENDER ADD LINE 2",
  "SENDER ADD LINE 3",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
] as const;

export type CodExportOrderRow = {
  id: string;
  customerName: string;
  customerPhone: string;
  addressLine1: string;
  addressLine2: string | null;
  addressLine3: string | null;
  city: string;
  state: string;
  postalCode: string;
  totalAmount: { toNumber(): number } | number | null;
  merchantOrderDisplayName: string | null;
  sourceOrderId: string | null;
};

export function formatCodExportPhone(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

export function codAmountValue(total: CodExportOrderRow["totalAmount"]): number {
  if (total == null) return 0;
  const n = typeof total === "number" ? total : total.toNumber();
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export function buildCodFile4Row(
  order: CodExportOrderRow,
  serialNumber: number,
  sender: CodSenderProfile = getCodSenderProfile(),
  article: CodArticleDefaults = getCodArticleDefaults(),
): unknown[] {
  const values: Record<string, string | number | boolean> = {
    "SERIAL NUMBER": serialNumber,
    "BARCODE NO":  "",
    "PHYSICAL WEIGHT": article.physicalWeight,
    "RECEIVER CITY": order.city.trim(),
    "RECEIVER PINCODE": order.postalCode.trim(),
    "RECEIVER NAME": order.customerName.trim(),
    "RECEIVER ADD LINE 1": order.addressLine1.trim(),
    "RECEIVER ADD LINE 2": order.addressLine2?.trim() ?? "",
    "RECEIVER ADD LINE 3": order.addressLine3?.trim() ?? "",
    ACK: false,
    "SENDER MOBILE NO": formatCodExportPhone(sender.mobile),
    "RECEIVER MOBILE NO": formatCodExportPhone(order.customerPhone),
    "CODR/COD": "COD",
    "VALUE FOR CODR/COD": codAmountValue(order.totalAmount),
    "SHAPE OF ARTICLE": article.shape,
    "LENGTH ": article.length,
    "BREADTH/DIAMETER": article.breadth,
    HEIGHT: article.height,
    "SENDER NAME": sender.name,
    "SENDER CITY": sender.city,
    "SENDER STATE/UT": sender.state,
    "SENDER PINCODE": sender.pincode,
    "RECEIVER STATE/UT": order.state.trim(),
    "SENDER ADD LINE 1": sender.addLine1,
    "SENDER ADD LINE 2": sender.addLine2,
    "SENDER ADD LINE 3": sender.addLine3,
  };

  return COD_FILE_4_HEADERS.map((header) => {
    if (!header) return "";
    const value = values[header];
    return value === undefined ? "" : value;
  });
}

export function buildCodFile4Workbook(orders: CodExportOrderRow[]): XLSX.WorkBook {
  const sender = getCodSenderProfile();
  const article = getCodArticleDefaults();
  const data = [
    [...COD_FILE_4_HEADERS],
    ...orders.map((order, index) => buildCodFile4Row(order, index + 1, sender, article)),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "ArticleDetails");
  return workbook;
}

export function buildCodFile4Buffer(orders: CodExportOrderRow[]): Buffer {
  const workbook = buildCodFile4Workbook(orders);
  return Buffer.from(
    XLSX.write(workbook, { type: "buffer", bookType: "xlsx", compression: true }),
  );
}

export function codExportFileName(now = new Date()): string {
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.toISOString().slice(11, 19).replace(/:/g, "");
  return `COD-export-${stamp}-${time}.xlsx`;
}

export function isCodExportAddressComplete(order: {
  customerName: string;
  customerPhone: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
}): boolean {
  return Boolean(
    order.customerName.trim() &&
      order.customerPhone.trim() &&
      order.addressLine1.trim() &&
      order.city.trim() &&
      order.state.trim() &&
      order.postalCode.trim(),
  );
}
