import type { AppSession } from "@/lib/auth";
import { hasAnyRole } from "@/lib/auth";
import { db } from "@/lib/db";

export type CallerAssignOption = {
  id: string;
  name: string;
  email: string;
};

const activeCallerWhere = {
  deletedAt: null,
  isActive: true,
  roles: {
    some: {
      deletedAt: null,
      role: { deletedAt: null, code: "CALLER" as const },
    },
  },
};

/** Active callers for bulk upload / bulk assign dropdowns. Managers only see their team. */
export async function getCallersForOrderAssign(input: {
  role: "admin" | "manager";
  managerUserId?: string;
}): Promise<CallerAssignOption[]> {
  if (input.role === "admin") {
    return db.user.findMany({
      where: activeCallerWhere,
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  }

  if (!input.managerUserId) {
    return [];
  }

  const team = await db.callerTeam.findFirst({
    where: { leaderId: input.managerUserId, deletedAt: null },
    select: {
      callers: {
        where: activeCallerWhere,
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      },
    },
  });

  return team?.callers ?? [];
}

export async function getManagerTeamCallerIds(managerUserId: string): Promise<string[]> {
  const callers = await getCallersForOrderAssign({
    role: "manager",
    managerUserId,
  });
  return callers.map((c) => c.id);
}

/** Ensures managers can only assign to callers on the team they lead. Admins bypass. */
export async function assertAssigneeAllowedForSession(
  session: AppSession,
  assigneeId: string,
): Promise<void> {
  if (hasAnyRole(session, ["ADMIN"])) {
    return;
  }

  if (!hasAnyRole(session, ["MANAGER"])) {
    throw new Error("Forbidden");
  }

  const allowedIds = await getManagerTeamCallerIds(session.userId);
  if (!allowedIds.includes(assigneeId)) {
    throw new Error("You can only assign orders to callers on your team.");
  }
}
