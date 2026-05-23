/** India Post COD bulk upload sender defaults (override via env). */
export type CodSenderProfile = {
  name: string;
  mobile: string;
  addLine1: string;
  addLine2: string;
  addLine3: string;
  city: string;
  state: string;
  pincode: string;
};

export type CodArticleDefaults = {
  physicalWeight: number;
  shape: string;
  length: number;
  breadth: number;
  height: number;
};

function envOr(key: string, fallback: string): string {
  const v = process.env[key]?.trim();
  return v && v.length > 0 ? v : fallback;
}

function envNumber(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function getCodSenderProfile(): CodSenderProfile {
  return {
    name: envOr("COD_SENDER_NAME", "kgn ayurveda"),
    mobile: envOr("COD_SENDER_MOBILE", "8302999568"),
    addLine1: envOr("COD_SENDER_ADD_LINE_1", "RAWLA"),
    addLine2: envOr("COD_SENDER_ADD_LINE_2", "RAWLA"),
    addLine3: envOr("COD_SENDER_ADD_LINE_3", "SRI GANGANAGAR"),
    city: envOr("COD_SENDER_CITY", "RAWLA"),
    state: envOr("COD_SENDER_STATE", "RAJASTHAN"),
    pincode: envOr("COD_SENDER_PINCODE", "335708"),
  };
}

export function getCodArticleDefaults(): CodArticleDefaults {
  return {
    physicalWeight: envNumber("COD_DEFAULT_WEIGHT", 480),
    shape: envOr("COD_DEFAULT_SHAPE", "NROL "),
    length: envNumber("COD_DEFAULT_LENGTH", 15),
    breadth: envNumber("COD_DEFAULT_BREADTH", 9.5),
    height: envNumber("COD_DEFAULT_HEIGHT", 9.5),
  };
}
