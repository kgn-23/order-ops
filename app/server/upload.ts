import * as XLSX from "xlsx";

type UploadRow = Record<string, unknown>;

const FIELD_MAP: Record<string, string> = {
  customername: "customerName",
  customer_name: "customerName",
  phone: "customerPhone",
  mobile: "customerPhone",
  customerphone: "customerPhone",
  address1: "addressLine1",
  addressline1: "addressLine1",
  address2: "addressLine2",
  addressline2: "addressLine2",
  state: "state",
  city: "city",
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
};

function normalizeKey(key: string) {
  return key.replace(/\s+/g, "").toLowerCase();
}

function normalizeRow(input: UploadRow) {
  const normalized: UploadRow = {};
  Object.entries(input).forEach(([key, value]) => {
    const mappedKey = FIELD_MAP[normalizeKey(key)] ?? key;
    normalized[mappedKey] = typeof value === "string" ? value.trim() : value;
  });
  return normalized;
}

export async function parseOrderUpload(file: File) {
  const bytes = await file.arrayBuffer();
  const workbook = XLSX.read(bytes, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const rows = XLSX.utils.sheet_to_json<UploadRow>(workbook.Sheets[firstSheetName], {
    defval: "",
  });
  return rows.map(normalizeRow);
}
