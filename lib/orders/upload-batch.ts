/** Shared bulk-upload batch sizes (safe for serverless + remote Postgres). */
export const UPLOAD_BATCH_SIZE = 50;
export const ASSIGN_BATCH_SIZE = 100;

export const UPLOAD_TX_OPTIONS = {
  maxWait: 10_000,
  timeout: 30_000,
} as const;

export function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}
