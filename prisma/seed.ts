import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { Pool } from "pg";
import { PrismaClient, UserRoleType } from "../app/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run seed");
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function hashPassword(password: string) {
  return hash(password, 12);
}

async function ensureRoles() {
  const roles: Array<{ code: UserRoleType; label: string }> = [
    { code: "ADMIN", label: "Admin" },
    { code: "MANAGER", label: "Manager" },
    { code: "CALLER", label: "Caller" },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { label: role.label, deletedAt: null },
      create: {
        code: role.code,
        label: role.label,
      },
    });
  }
}

async function seedAdminUser() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@kgn.com").trim().toLowerCase();
  const adminName = process.env.ADMIN_NAME ?? "KGN Admin";
  const adminPhone = process.env.ADMIN_PHONE ?? "9658020786";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";
  const adminPasswordHash = await hashPassword(adminPassword);

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { code: "ADMIN" },
    select: { id: true },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      phone: adminPhone,
      passwordHash: adminPasswordHash,
      isActive: true,
      deletedAt: null,
    },
    create: {
      name: adminName,
      email: adminEmail,
      phone: adminPhone,
      passwordHash: adminPasswordHash,
      isActive: true,
    },
    select: { id: true, email: true },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: { deletedAt: null },
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  return adminUser.email;
}

async function seedTeamSamples() {
  const managerRole = await prisma.role.findUniqueOrThrow({
    where: { code: "MANAGER" },
    select: { id: true },
  });
  const callerRole = await prisma.role.findUniqueOrThrow({
    where: { code: "CALLER" },
    select: { id: true },
  });

  const managerEmail = (process.env.SEED_MANAGER_EMAIL ?? "manager@kgn.local").trim().toLowerCase();
  const managerPassword = process.env.SEED_MANAGER_PASSWORD ?? "manager123";
  const managerPasswordHash = await hashPassword(managerPassword);
  const managerUser = await prisma.user.upsert({
    where: { email: managerEmail },
    update: {
      name: "Sample Manager",
      passwordHash: managerPasswordHash,
      isActive: true,
      deletedAt: null,
    },
    create: {
      name: "Sample Manager",
      email: managerEmail,
      phone: "8888888888",
      passwordHash: managerPasswordHash,
      isActive: true,
    },
    select: { id: true },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: managerUser.id, roleId: managerRole.id } },
    update: { deletedAt: null },
    create: { userId: managerUser.id, roleId: managerRole.id },
  });

  const teamName = process.env.SEED_CALLER_TEAM_NAME ?? "Primary Caller Team";
  const callerTeam = await prisma.callerTeam.upsert({
    where: { leaderId: managerUser.id },
    update: { name: teamName, deletedAt: null },
    create: { name: teamName, leaderId: managerUser.id },
    select: { id: true },
  });

  const callerEmail = (process.env.SEED_CALLER_EMAIL ?? "caller@kgn.local").trim().toLowerCase();
  const callerPassword = process.env.SEED_CALLER_PASSWORD ?? "caller123";
  const callerPasswordHash = await hashPassword(callerPassword);
  const callerUser = await prisma.user.upsert({
    where: { email: callerEmail },
    update: {
      name: "Sample Caller",
      passwordHash: callerPasswordHash,
      isActive: true,
      deletedAt: null,
      callerTeamId: callerTeam.id,
    },
    create: {
      name: "Sample Caller",
      email: callerEmail,
      phone: "7777777777",
      passwordHash: callerPasswordHash,
      isActive: true,
      callerTeamId: callerTeam.id,
    },
    select: { id: true },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: callerUser.id, roleId: callerRole.id } },
    update: { deletedAt: null },
    create: { userId: callerUser.id, roleId: callerRole.id },
  });
}

async function main() {
  await ensureRoles();
  const adminEmail = await seedAdminUser();
  // await seedTeamSamples();
  console.log(`Admin user ready: ${adminEmail}`);
  console.log("Sample manager and caller upserted (manager@kgn.local, caller@kgn.local).");
  console.log("Passwords can be configured via ADMIN_PASSWORD / SEED_MANAGER_PASSWORD / SEED_CALLER_PASSWORD.");
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
