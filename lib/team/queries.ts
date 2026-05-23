import { db } from "@/lib/db";

export type TeamUserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  operationalRoles: ("MANAGER" | "CALLER")[];
  callerTeam: { id: string; name: string } | null;
};

export type CallerTeamRow = {
  id: string;
  name: string;
  leader: { id: string; name: string; email: string };
  callerCount: number;
};

export async function getTeamUsers(): Promise<TeamUserRow[]> {
  const rows = await db.user.findMany({
    where: {
      deletedAt: null,
      roles: {
        some: {
          deletedAt: null,
          role: { deletedAt: null, code: { in: ["MANAGER", "CALLER"] } },
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,
      roles: {
        where: { deletedAt: null, role: { deletedAt: null } },
        select: { role: { select: { code: true } } },
      },
      callerTeam: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });

  return rows.map((row) => {
    const codes = row.roles
      .map((r) => r.role.code)
      .filter((c): c is "MANAGER" | "CALLER" => c === "MANAGER" || c === "CALLER");
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      isActive: row.isActive,
      operationalRoles: codes,
      callerTeam: row.callerTeam,
    };
  });
}

export async function getCallerTeams(): Promise<CallerTeamRow[]> {
  const teams = await db.callerTeam.findMany({
    where: { deletedAt: null, leader: { deletedAt: null, isActive: true } },
    select: {
      id: true,
      name: true,
      leader: { select: { id: true, name: true, email: true } },
      _count: {
        select: {
          callers: {
            where: {
              deletedAt: null,
              isActive: true,
              roles: { some: { deletedAt: null, role: { code: "CALLER", deletedAt: null } } },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    leader: t.leader,
    callerCount: t._count.callers,
  }));
}

export async function getManagerOptions() {
  return db.user.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      roles: { some: { deletedAt: null, role: { code: "MANAGER", deletedAt: null } } },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
    take: 100,
  });
}
