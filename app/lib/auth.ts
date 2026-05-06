import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/app/lib/db";

export type AppRole = "ADMIN" | "MANAGER" | "CALLER";

export type AppSession = {
  userId: string;
  name: string;
  email: string;
  roles: AppRole[];
};

export const APP_SESSION_COOKIE = "kgn_session_user_id";

function parseMockSession(): AppSession | null {
  const payload = process.env.MOCK_SESSION_JSON;

  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload) as AppSession;
  } catch {
    return null;
  }
}

export async function getSessionOptional(): Promise<AppSession | null> {
  const mock = parseMockSession();
  if (mock) return mock;

  const cookieStore = await cookies();
  const userId = cookieStore.get(APP_SESSION_COOKIE)?.value;
  if (!userId) return null;

  const user = await db.user.findFirst({
    where: { id: userId, deletedAt: null, isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      roles: {
        where: { deletedAt: null, role: { deletedAt: null } },
        select: { role: { select: { code: true } } },
      },
    },
  });
  if (!user) return null;

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    roles: user.roles.map((item) => item.role.code as AppRole),
  };
}

export async function getSession(): Promise<AppSession> {
  const session = await getSessionOptional();
  if (!session) {
    redirect("/signin");
  }
  return session;
}

export function hasAnyRole(session: AppSession, roles: AppRole[]) {
  return roles.some((role) => session.roles.includes(role));
}

export async function requireRole(roles: AppRole[]) {
  const session = await getSession();
  if (!hasAnyRole(session, roles)) {
    throw new Error("Forbidden");
  }
  return session;
}
