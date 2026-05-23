"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { compare } from "bcryptjs";
import { z } from "zod";

import { db } from "@/lib/db";
import { APP_SESSION_COOKIE } from "@/lib/auth";
import { getDefaultSection } from "@/lib/route-access";

const loginSchema = z.object({
  userId: z.string().min(1),
});

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

async function createSession(userId: string) {
  const user = await db.user.findFirst({
    where: { id: userId, deletedAt: null, isActive: true },
    select: {
      id: true,
      roles: {
        where: { deletedAt: null, role: { deletedAt: null } },
        select: { role: { select: { code: true } } },
      },
    },
  });
  if (!user) {
    throw new Error("Unable to sign in with selected user.");
  }

  const roles = user.roles.map((item) => item.role.code) as Array<"ADMIN" | "MANAGER" | "CALLER">;
  const cookieStore = await cookies();
  cookieStore.set(APP_SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return getDefaultSection(roles);
}

export async function loginAsUser(formData: FormData) {
  const payload = loginSchema.parse({
    userId: String(formData.get("userId") ?? ""),
  });

  const section = await createSession(payload.userId);
  redirect(`/${section}/dashboard`);
}

export async function loginWithCredentials(formData: FormData) {
  const result = credentialsSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!result.success) {
    redirect("/signin?error=invalid_credentials");
  }

  const user = await db.user.findFirst({
    where: { email: result.data.email.toLowerCase(), deletedAt: null, isActive: true },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    redirect("/signin?error=invalid_credentials");
  }

  const isPasswordValid = await compare(result.data.password, user.passwordHash);
  if (!isPasswordValid) {
    redirect("/signin?error=invalid_credentials");
  }

  const section = await createSession(user.id);
  redirect(`/${section}/dashboard`);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(APP_SESSION_COOKIE);
  redirect("/signin");
}
