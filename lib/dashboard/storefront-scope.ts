import type { Prisma } from "@/app/generated/prisma/client";
import type { AppSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { STOREFRONT_ORDER_SOURCE } from "@/lib/orders/source";

export type StorefrontDashboardScope =
  | {
      role: "admin";
      teamId: string | null;
      teamName: string | null;
      callerIds: string[] | null;
    }
  | {
      role: "manager";
      teamId: string;
      teamName: string;
      callerIds: string[];
    };

export function storefrontOrderWhere(callerIds: string[] | null): Prisma.OrderWhereInput {
  const base: Prisma.OrderWhereInput = {
    deletedAt: null,
    sourceSystem: STOREFRONT_ORDER_SOURCE,
  };
  if (!callerIds?.length) return base;
  return {
    ...base,
    assignments: {
      some: {
        deletedAt: null,
        isActive: true,
        assigneeId: { in: callerIds },
      },
    },
  };
}

export function callerInScopeWhere(callerIds: string[] | null): Prisma.StringFilter | undefined {
  if (!callerIds?.length) return undefined;
  return { in: callerIds };
}

export async function resolveStorefrontDashboardScope(
  session: AppSession,
  teamIdParam?: string | null,
): Promise<StorefrontDashboardScope> {
  const isAdmin = session.roles.includes("ADMIN");

  if (isAdmin) {
    if (!teamIdParam) {
      return { role: "admin", teamId: null, teamName: null, callerIds: null };
    }
    const team = await db.callerTeam.findFirst({
      where: { id: teamIdParam, deletedAt: null },
      select: {
        id: true,
        name: true,
        callers: {
          where: {
            deletedAt: null,
            isActive: true,
            roles: { some: { deletedAt: null, role: { code: "CALLER", deletedAt: null } } },
          },
          select: { id: true },
        },
      },
    });
    if (!team) {
      return { role: "admin", teamId: null, teamName: null, callerIds: null };
    }
    return {
      role: "admin",
      teamId: team.id,
      teamName: team.name,
      callerIds: team.callers.map((c) => c.id),
    };
  }

  const team = await db.callerTeam.findFirst({
    where: { leaderId: session.userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      callers: {
        where: {
          deletedAt: null,
          isActive: true,
          roles: { some: { deletedAt: null, role: { code: "CALLER", deletedAt: null } } },
        },
        select: { id: true, name: true },
      },
    },
  });

  if (!team) {
    return { role: "manager", teamId: "", teamName: "", callerIds: [] };
  }

  return {
    role: "manager",
    teamId: team.id,
    teamName: team.name,
    callerIds: team.callers.map((c) => c.id),
  };
}

export async function listTeamsForDashboardFilter(): Promise<Array<{ id: string; name: string }>> {
  const teams = await db.callerTeam.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return teams;
}
