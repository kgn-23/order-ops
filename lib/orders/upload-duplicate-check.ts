import type { z } from "zod";

import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/orders/actions/shared";
import type { orderUploadRowSchema } from "@/lib/validators/contracts";

export const UPLOAD_DUPLICATE_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

export type UploadDuplicateReason = "PHONE" | "TRACKING" | "FILE_PHONE" | "FILE_TRACKING";

export type UploadDuplicateMatch = {
  orderId: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  trackingNumber: string | null;
  currentStage: string;
};

export type UploadRowDuplicateResult = {
  rowIndex: number;
  isDuplicate: boolean;
  reasons: UploadDuplicateReason[];
  matches: UploadDuplicateMatch[];
  fileDuplicateOfRowIndex?: number;
};

export type UploadDuplicateAnalysis = {
  rows: UploadRowDuplicateResult[];
  summary: {
    total: number;
    newCount: number;
    duplicateCount: number;
  };
};

type UploadRowInput = Pick<
  z.infer<typeof orderUploadRowSchema>,
  "customerPhone" | "trackingNumber"
>;

export type RecentOrderForDuplicateCheck = {
  id: string;
  createdAt: Date;
  customerName: string;
  customerPhone: string;
  trackingNumber: string | null;
  currentStage: string;
};

function normalizeTracking(tracking: string | undefined): string | null {
  const trimmed = tracking?.trim();
  return trimmed ? trimmed : null;
}

export function getUploadDuplicateCutoff(reference: Date = new Date()): Date {
  return new Date(reference.getTime() - UPLOAD_DUPLICATE_LOOKBACK_MS);
}

export function mapOrderToDuplicateMatch(order: RecentOrderForDuplicateCheck): UploadDuplicateMatch {
  return {
    orderId: order.id,
    createdAt: order.createdAt.toISOString(),
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    trackingNumber: order.trackingNumber,
    currentStage: order.currentStage,
  };
}

export function checkWithinFileDuplicates(
  rows: UploadRowInput[],
): Map<number, { reasons: UploadDuplicateReason[]; fileDuplicateOfRowIndex?: number }> {
  const phoneFirstIndex = new Map<string, number>();
  const trackingFirstIndex = new Map<string, number>();
  const results = new Map<
    number,
    { reasons: UploadDuplicateReason[]; fileDuplicateOfRowIndex?: number }
  >();

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]!;
    const reasons: UploadDuplicateReason[] = [];
    let fileDuplicateOfRowIndex: number | undefined;

    const phone = normalizePhone(row.customerPhone);
    const phoneFirst = phoneFirstIndex.get(phone);
    if (phoneFirst !== undefined) {
      reasons.push("FILE_PHONE");
      fileDuplicateOfRowIndex ??= phoneFirst;
    } else {
      phoneFirstIndex.set(phone, rowIndex);
    }

    const tracking = normalizeTracking(row.trackingNumber);
    if (tracking) {
      const trackingFirst = trackingFirstIndex.get(tracking);
      if (trackingFirst !== undefined) {
        reasons.push("FILE_TRACKING");
        fileDuplicateOfRowIndex ??= trackingFirst;
      } else {
        trackingFirstIndex.set(tracking, rowIndex);
      }
    }

    if (reasons.length > 0) {
      results.set(rowIndex, { reasons, fileDuplicateOfRowIndex });
    }
  }

  return results;
}

export function checkDatabaseDuplicates(
  rows: UploadRowInput[],
  existingOrders: RecentOrderForDuplicateCheck[],
): Map<number, { reasons: UploadDuplicateReason[]; matches: UploadDuplicateMatch[] }> {
  const ordersByPhone = new Map<string, UploadDuplicateMatch[]>();
  const ordersByTracking = new Map<string, UploadDuplicateMatch[]>();

  for (const order of existingOrders) {
    const match = mapOrderToDuplicateMatch(order);
    const phone = normalizePhone(order.customerPhone);
    const phoneList = ordersByPhone.get(phone) ?? [];
    phoneList.push(match);
    ordersByPhone.set(phone, phoneList);

    const tracking = normalizeTracking(order.trackingNumber ?? undefined);
    if (tracking) {
      const trackingList = ordersByTracking.get(tracking) ?? [];
      trackingList.push(match);
      ordersByTracking.set(tracking, trackingList);
    }
  }

  const results = new Map<
    number,
    { reasons: UploadDuplicateReason[]; matches: UploadDuplicateMatch[] }
  >();

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]!;
    const reasons: UploadDuplicateReason[] = [];
    const matches: UploadDuplicateMatch[] = [];
    const seenOrderIds = new Set<string>();

    const addMatches = (next: UploadDuplicateMatch[], reason: UploadDuplicateReason) => {
      let added = false;
      for (const match of next) {
        if (seenOrderIds.has(match.orderId)) continue;
        seenOrderIds.add(match.orderId);
        matches.push(match);
        added = true;
      }
      if (added) {
        reasons.push(reason);
      }
    };

    const phone = normalizePhone(row.customerPhone);
    addMatches(ordersByPhone.get(phone) ?? [], "PHONE");

    const tracking = normalizeTracking(row.trackingNumber);
    if (tracking) {
      addMatches(ordersByTracking.get(tracking) ?? [], "TRACKING");
    }

    if (reasons.length > 0) {
      results.set(rowIndex, { reasons, matches });
    }
  }

  return results;
}

export async function fetchRecentOrdersForDuplicateCheck(
  phones: string[],
  trackings: string[],
  cutoff: Date,
): Promise<RecentOrderForDuplicateCheck[]> {
  const normalizedPhones = [...new Set(phones.map(normalizePhone).filter(Boolean))];
  const normalizedTrackings = [...new Set(trackings.map((t) => normalizeTracking(t)).filter(Boolean))] as string[];

  if (normalizedPhones.length === 0 && normalizedTrackings.length === 0) {
    return [];
  }

  const or: Array<{ customerPhone: { in: string[] } } | { trackingNumber: { in: string[] } }> = [];
  if (normalizedPhones.length > 0) {
    or.push({ customerPhone: { in: normalizedPhones } });
  }
  if (normalizedTrackings.length > 0) {
    or.push({ trackingNumber: { in: normalizedTrackings } });
  }

  return db.order.findMany({
    where: {
      deletedAt: null,
      createdAt: { gte: cutoff },
      OR: or,
    },
    select: {
      id: true,
      createdAt: true,
      customerName: true,
      customerPhone: true,
      trackingNumber: true,
      currentStage: true,
    },
  });
}

function mergeRowDuplicateResult(
  rowIndex: number,
  fileResult?: { reasons: UploadDuplicateReason[]; fileDuplicateOfRowIndex?: number },
  dbResult?: { reasons: UploadDuplicateReason[]; matches: UploadDuplicateMatch[] },
): UploadRowDuplicateResult {
  const reasons = [...new Set([...(fileResult?.reasons ?? []), ...(dbResult?.reasons ?? [])])];
  const matches = dbResult?.matches ?? [];

  return {
    rowIndex,
    isDuplicate: reasons.length > 0,
    reasons,
    matches,
    fileDuplicateOfRowIndex: fileResult?.fileDuplicateOfRowIndex,
  };
}

export function buildUploadDuplicateAnalysis(
  rows: UploadRowInput[],
  existingOrders: RecentOrderForDuplicateCheck[],
): UploadDuplicateAnalysis {
  const fileResults = checkWithinFileDuplicates(rows);
  const dbResults = checkDatabaseDuplicates(rows, existingOrders);

  const rowResults: UploadRowDuplicateResult[] = rows.map((_, rowIndex) =>
    mergeRowDuplicateResult(rowIndex, fileResults.get(rowIndex), dbResults.get(rowIndex)),
  );

  const duplicateCount = rowResults.filter((row) => row.isDuplicate).length;

  return {
    rows: rowResults,
    summary: {
      total: rows.length,
      newCount: rows.length - duplicateCount,
      duplicateCount,
    },
  };
}

export async function analyzeUploadDuplicates(
  rows: UploadRowInput[],
  reference: Date = new Date(),
): Promise<UploadDuplicateAnalysis> {
  const cutoff = getUploadDuplicateCutoff(reference);
  const phones = rows.map((row) => row.customerPhone);
  const trackings = rows
    .map((row) => normalizeTracking(row.trackingNumber))
    .filter((tracking): tracking is string => tracking !== null);

  const existingOrders = await fetchRecentOrdersForDuplicateCheck(phones, trackings, cutoff);
  return buildUploadDuplicateAnalysis(rows, existingOrders);
}
