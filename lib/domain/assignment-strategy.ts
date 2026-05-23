import type { AssignmentStrategy, AssignmentStrategyInput } from "@/lib/domain/modules";

export class ManualAssignmentStrategy implements AssignmentStrategy {
  name = "MANUAL" as const;

  pickCaller(input: AssignmentStrategyInput): string | null {
    return input.callerIds[0] ?? null;
  }
}

export class RoundRobinAssignmentStrategy implements AssignmentStrategy {
  name = "ROUND_ROBIN" as const;
  private static cursor = 0;

  pickCaller(input: AssignmentStrategyInput): string | null {
    if (input.callerIds.length === 0) return null;
    const index = RoundRobinAssignmentStrategy.cursor % input.callerIds.length;
    RoundRobinAssignmentStrategy.cursor += 1;
    return input.callerIds[index] ?? null;
  }
}

export class RuleBasedAssignmentStrategy implements AssignmentStrategy {
  name = "RULE_BASED" as const;

  pickCaller(input: AssignmentStrategyInput): string | null {
    if (input.callerIds.length === 0) return null;
    const stableIndex = (input.assignmentKey?.length ?? 0) % input.callerIds.length;
    return input.callerIds[stableIndex] ?? null;
  }
}
