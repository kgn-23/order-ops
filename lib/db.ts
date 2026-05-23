import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

function buildClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = globalForPrisma.pool ?? new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }

  return prisma;
}

export const db =
  process.env.NODE_ENV === "production"
    ? globalForPrisma.prisma ??
      (() => {
        const prisma = buildClient();
        globalForPrisma.prisma = prisma;
        return prisma;
      })()
    : buildClient();
