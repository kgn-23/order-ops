import type { CallOutcomeType } from "@/app/generated/prisma/client";

/** Matches `CallOutcomeType` in `prisma/schema.prisma`. */
export const CALL_OUTCOME_VALUES = [
  "CALLED",
  "NO_ANSWER",
  "BUSY",
  "FAILED",
  "INVALID_NUMBER",
  "OTHER",
] as const satisfies readonly CallOutcomeType[];

export type CallOutcome = (typeof CALL_OUTCOME_VALUES)[number];

export const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
  CALLED: "Called",
  NO_ANSWER: "No answer",
  BUSY: "Busy",
  FAILED: "Failed",
  INVALID_NUMBER: "Invalid number",
  OTHER: "Other",
};

/** Storefront: successful call + verified shipping address saved on the order. */
export const STOREFRONT_CONFIRM_OUTCOME: CallOutcome = "CALLED";

export function isStorefrontConfirmOutcome(outcome: string): boolean {
  return outcome === STOREFRONT_CONFIRM_OUTCOME;
}
