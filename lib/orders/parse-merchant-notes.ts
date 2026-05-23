/** Fields extracted from Shopify-style checkout notes (easysell_cod_form, etc.). */
export type ParsedMerchantNotes = {
  customerName?: string;
  customerPhone?: string;
  addressLine1?: string;
  addressLine3?: string;
  postalCode?: string;
};

const NOTE_LINE_PATTERNS: { key: keyof ParsedMerchantNotes; re: RegExp }[] = [
  { key: "customerName", re: /^Full Name:\s*(.+)$/im },
  { key: "customerPhone", re: /^Mobile Number:\s*(.+)$/im },
  { key: "addressLine1", re: /^Complete full address.*?:\s*(.+)$/im },
  { key: "addressLine3", re: /^Nearby Landmark.*?:\s*(.+)$/im },
  { key: "postalCode", re: /^Pincode:\s*(\d{4,6})\s*$/im },
];

export function parseMerchantOrderNotes(notes: string | null | undefined): ParsedMerchantNotes {
  if (!notes?.trim()) return {};

  const result: ParsedMerchantNotes = {};
  for (const { key, re } of NOTE_LINE_PATTERNS) {
    const match = notes.match(re);
    const value = match?.[1]?.trim();
    if (value) result[key] = value;
  }
  return result;
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || String(value).trim() === "";
}

/** Fill empty address/name/phone fields from structured merchant notes (storefront imports). */
export function enrichOrderRowFromMerchantNotes<T extends Record<string, unknown>>(row: T): T {
  const notes = row.merchantOrderNotes;
  if (typeof notes !== "string" || !notes.trim()) return row;

  const parsed = parseMerchantOrderNotes(notes);
  const out = { ...row } as Record<string, unknown>;

  if (isBlank(out.customerName) && parsed.customerName) out.customerName = parsed.customerName;
  if (isBlank(out.customerPhone) && parsed.customerPhone) out.customerPhone = parsed.customerPhone;
  if (isBlank(out.addressLine1) && parsed.addressLine1) out.addressLine1 = parsed.addressLine1;
  if (isBlank(out.addressLine3) && parsed.addressLine3) out.addressLine3 = parsed.addressLine3;
  if (isBlank(out.postalCode) && parsed.postalCode) out.postalCode = parsed.postalCode;

  return out as T;
}

export function formatOrderAddressSummary(parts: {
  addressLine1: string;
  addressLine2?: string | null;
  addressLine3?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country?: string | null;
}): string {
  return [
    parts.addressLine1,
    parts.addressLine2,
    parts.addressLine3,
    [parts.city, parts.state].filter(Boolean).join(", "),
    parts.postalCode,
    parts.country,
  ]
    .filter((line) => line != null && String(line).trim() !== "")
    .join("\n");
}
