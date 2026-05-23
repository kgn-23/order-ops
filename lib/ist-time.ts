/**
 * Indian Standard Time (UTC+5:30, no DST) for reporting and Prisma date filters.
 * All “calendar day” boundaries in server queries should use these helpers.
 */
export const IST_TIMEZONE = "Asia/Kolkata" as const;

/** YYYY-MM-DD in IST for the instant `d` (wall clock in Kolkata). */
export function formatIstCalendarDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * UTC instants for the IST calendar day containing `reference`:
 * [start, endExclusive) — use with Prisma as `gte: start, lt: endExclusive`.
 */
export function getIstDayRangeUtc(reference: Date = new Date()): { start: Date; endExclusive: Date } {
  const ymd = formatIstCalendarDateString(reference);
  const start = new Date(`${ymd}T00:00:00+05:30`);
  const endExclusive = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, endExclusive };
}

/** Human-readable IST calendar date for UI (matches server query “today”). */
export function formatIstLongDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

/** YYYY-MM-DD (strict). */
const ISO_CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** UTC instant of IST midnight at the start of this calendar date. */
export function istCalendarDateToUtcStart(ymd: string): Date | null {
  const t = ymd.trim();
  if (!ISO_CALENDAR_DATE.test(t)) return null;
  const d = new Date(`${t}T00:00:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** UTC instant of the first moment after this IST calendar date (for Prisma `lt`). */
export function istCalendarDateToUtcEndExclusive(ymd: string): Date | null {
  const start = istCalendarDateToUtcStart(ymd);
  if (!start) return null;
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Validates optional `YYYY-MM-DD` strings and returns an inclusive IST calendar range
 * (single day if only one side is set). Swaps if `from` > `to`.
 */
export function normalizeIstCreatedDateParams(
  fromRaw?: string | null,
  toRaw?: string | null,
): { from: string | null; to: string | null } {
  const from = fromRaw?.trim() && ISO_CALENDAR_DATE.test(fromRaw.trim()) ? fromRaw.trim() : null;
  const to = toRaw?.trim() && ISO_CALENDAR_DATE.test(toRaw.trim()) ? toRaw.trim() : null;
  if (!from && !to) return { from: null, to: null };
  let a = from ?? to!;
  let b = to ?? from!;
  if (a > b) {
    const tmp = a;
    a = b;
    b = tmp;
  }
  return { from: a, to: b };
}

/** Query-string helper: valid `YYYY-MM-DD` or `undefined`. */
export function parseOptionalIstDateParam(raw?: string | null): string | undefined {
  const t = raw?.trim();
  if (!t || !ISO_CALENDAR_DATE.test(t)) return undefined;
  return t;
}

export const IST_DATE_RANGE_PRESETS = [
  "today",
  "yesterday",
  "this_week",
  "this_month",
] as const;

export type IstDateRangePreset = (typeof IST_DATE_RANGE_PRESETS)[number];

export const IST_DATE_RANGE_PRESET_LABELS: Record<IstDateRangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This week",
  this_month: "This month",
};

/** Inclusive IST calendar `from` / `to` (`YYYY-MM-DD`) for a named period. Week starts Monday (IST). */
export function getIstDateRangeForPreset(
  preset: IstDateRangePreset,
  reference: Date = new Date(),
): { from: string; to: string } {
  const today = formatIstCalendarDateString(reference);
  if (preset === "today") {
    return { from: today, to: today };
  }
  if (preset === "yesterday") {
    const todayStart = istCalendarDateToUtcStart(today)!;
    const ymd = formatIstCalendarDateString(new Date(todayStart.getTime() - 24 * 60 * 60 * 1000));
    return { from: ymd, to: ymd };
  }
  if (preset === "this_month") {
    return { from: `${today.slice(0, 7)}-01`, to: today };
  }

  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIMEZONE,
    weekday: "short",
  }).format(reference);
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = dowMap[weekday] ?? 0;
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;
  const todayStart = istCalendarDateToUtcStart(today)!;
  const monday = formatIstCalendarDateString(
    new Date(todayStart.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000),
  );
  return { from: monday, to: today };
}

export function detectIstDateRangePreset(
  from: string,
  to: string,
  reference: Date = new Date(),
): IstDateRangePreset | "custom" {
  for (const preset of IST_DATE_RANGE_PRESETS) {
    const range = getIstDateRangeForPreset(preset, reference);
    if (range.from === from && range.to === to) return preset;
  }
  return "custom";
}

/** UTC `[start, endExclusive)` for an inclusive IST calendar date range. */
export function getIstRangeUtc(
  fromRaw?: string | null,
  toRaw?: string | null,
  reference: Date = new Date(),
): { start: Date; endExclusive: Date; from: string; to: string } {
  const today = formatIstCalendarDateString(reference);
  const normalized = normalizeIstCreatedDateParams(fromRaw ?? today, toRaw ?? today);
  const from = normalized.from ?? today;
  const to = normalized.to ?? today;
  const start = istCalendarDateToUtcStart(from)!;
  const endExclusive = istCalendarDateToUtcEndExclusive(to)!;
  return { start, endExclusive, from, to };
}
