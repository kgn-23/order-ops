export const DOMAIN_MODULES = [
  "auth-rbac",
  "orders",
  "assignment",
  "tracking",
  "calling",
  "reporting",
  "audit",
] as const;

export type DomainModule = (typeof DOMAIN_MODULES)[number];

export type TrackingStage =
  | "BOOKED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "RTO"
  | "OTHER";

export type CarrierOperation = "TRACKING" | "BOOKING" | "LABEL";

export interface CarrierPayload {
  provider: string;
  operation: CarrierOperation;
  orderRef: string;
  externalStatus?: string;
  normalizedStage?: TrackingStage;
  rawPayload?: Record<string, unknown>;
}

export interface AssignmentStrategyInput {
  orderId: string;
  callerIds: string[];
  assignmentKey?: string;
}

export interface AssignmentStrategy {
  name: "MANUAL" | "ROUND_ROBIN" | "RULE_BASED";
  pickCaller(input: AssignmentStrategyInput): string | null;
}
