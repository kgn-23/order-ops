"use server";

import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";

import type { Prisma } from "@/app/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { createCallerTeamSchema, createTeamUserSchema, updateTeamUserSchema } from "@/lib/validators/contracts";

type OpRole = "MANAGER" | "CALLER";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function syncOperationalRoles(tx: Prisma.TransactionClient, userId: string, activeRole: OpRole) {
  const roleRows = await tx.role.findMany({
    where: { code: { in: ["MANAGER", "CALLER"] }, deletedAt: null },
    select: { id: true, code: true },
  });

  const byCode = Object.fromEntries(roleRows.map((r) => [r.code, r.id])) as Record<OpRole, string>;
  if (!byCode.MANAGER || !byCode.CALLER) {
    throw new Error("MANAGER and CALLER roles must exist in the database (run seed).");
  }

  for (const code of ["MANAGER", "CALLER"] as const) {
    const roleId = byCode[code];
    const existing = await tx.userRole.findFirst({
      where: { userId, roleId },
    });

    if (code === activeRole) {
      if (existing) {
        await tx.userRole.update({
          where: { id: existing.id },
          data: { deletedAt: null },
        });
      } else {
        await tx.userRole.create({
          data: { userId, roleId },
        });
      }
    } else if (existing && existing.deletedAt == null) {
      await tx.userRole.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() },
      });
    }
  }
}

async function assertTeamMember(userId: string) {
  const user = await db.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
      roles: {
        some: {
          deletedAt: null,
          role: { deletedAt: null, code: { in: ["MANAGER", "CALLER"] } },
        },
      },
    },
    select: { id: true },
  });
  if (!user) {
    throw new Error("User is not a manager or caller on this team.");
  }
}

export type TeamActionResult = { ok: true } | { ok: false; error: string };

async function assertManager(tx: Prisma.TransactionClient, userId: string) {
  const manager = await tx.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
      isActive: true,
      roles: { some: { deletedAt: null, role: { code: "MANAGER", deletedAt: null } } },
    },
    select: { id: true },
  });
  if (!manager) {
    throw new Error("Selected team leader must be an active manager.");
  }
}

export async function createTeamUser(input: unknown): Promise<TeamActionResult> {
  const session = await requireRole(["ADMIN"]);
  const parsed = createTeamUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().formErrors.join(" ") || "Invalid input" };
  }

  const { name, email, phone, role, callerTeamId, initialPassword } = parsed.data;
  const normalizedEmail = normalizeEmail(email);

  if (role === "CALLER" && !callerTeamId) {
    return { ok: false, error: "Caller must be assigned to a team." };
  }

  const existing = await db.user.findFirst({
    where: { email: normalizedEmail, deletedAt: null },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: "A user with this email already exists." };
  }

  try {
    const initialPasswordHash = await hash(initialPassword, 12);

    await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash: initialPasswordHash,
          phone: phone ?? null,
          isActive: true,
          callerTeamId: role === "CALLER" ? callerTeamId ?? null : null,
        },
        select: { id: true },
      });

      await syncOperationalRoles(tx, user.id, role);

      await tx.activityLog.create({
        data: {
          actorUserId: session.userId,
          entityType: "USER",
          entityId: user.id,
          action: "TEAM_USER_CREATED",
          details: {
            email: normalizedEmail,
            role,
            callerTeamId: role === "CALLER" ? callerTeamId ?? null : null,
          } as Prisma.InputJsonValue,
        },
      });
    });
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "P2002") {
      return { ok: false, error: "A user with this email already exists." };
    }
    throw e;
  }

  revalidatePath("/admin/team");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/commerce");
  return { ok: true };
}

export async function updateTeamUser(input: unknown): Promise<TeamActionResult> {
  const session = await requireRole(["ADMIN"]);
  const parsed = updateTeamUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().formErrors.join(" ") || "Invalid input" };
  }

  const { userId, name, email, phone, isActive, role, callerTeamId, newPassword } = parsed.data;
  const normalizedEmail = normalizeEmail(email);

  if (!isActive && userId === session.userId) {
    return { ok: false, error: "You cannot deactivate your own account." };
  }
  if (role === "CALLER" && !callerTeamId) {
    return { ok: false, error: "Caller must be assigned to a team." };
  }

  await assertTeamMember(userId);

  const duplicate = await db.user.findFirst({
    where: { email: normalizedEmail, deletedAt: null, NOT: { id: userId } },
    select: { id: true },
  });
  if (duplicate) {
    return { ok: false, error: "Another user already uses this email." };
  }

  const passwordHash =
    newPassword !== undefined && newPassword.trim().length > 0 ? await hash(newPassword.trim(), 12) : null;

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        name,
        email: normalizedEmail,
        phone: phone ?? null,
        isActive,
        callerTeamId: role === "CALLER" ? callerTeamId ?? null : null,
        ...(passwordHash ? { passwordHash } : {}),
      },
    });

    await syncOperationalRoles(tx, userId, role);

    await tx.activityLog.create({
      data: {
        actorUserId: session.userId,
        entityType: "USER",
        entityId: userId,
        action: "TEAM_USER_UPDATED",
        details: {
          email: normalizedEmail,
          role,
          isActive,
          callerTeamId: role === "CALLER" ? callerTeamId ?? null : null,
        } as Prisma.InputJsonValue,
      },
    });
  });

  revalidatePath("/admin/team");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/commerce");
  return { ok: true };
}

export async function createCallerTeam(input: unknown): Promise<TeamActionResult> {
  const session = await requireRole(["ADMIN"]);
  const parsed = createCallerTeamSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().formErrors.join(" ") || "Invalid input" };
  }
  const { name, leaderUserId } = parsed.data;

  try {
    await db.$transaction(async (tx) => {
      await assertManager(tx, leaderUserId);
      const team = await tx.callerTeam.create({
        data: {
          name,
          leaderId: leaderUserId,
        },
        select: { id: true },
      });
      await tx.activityLog.create({
        data: {
          actorUserId: session.userId,
          entityType: "CALLER_TEAM",
          entityId: team.id,
          action: "CALLER_TEAM_CREATED",
          details: { name, leaderUserId } as Prisma.InputJsonValue,
        },
      });
    });
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "P2002") {
      return { ok: false, error: "This manager already leads a team." };
    }
    throw e;
  }

  revalidatePath("/admin/team");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/commerce");
  return { ok: true };
}
