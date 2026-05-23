import { db } from "@/lib/db";

export async function getFormOptions() {
  const [orders, callers] = await Promise.all([
    db.order.findMany({
      where: { deletedAt: null },
      select: { id: true, customerName: true, currentStage: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        roles: {
          some: {
            deletedAt: null,
            role: { deletedAt: null, code: "CALLER" },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        roles: {
          where: { deletedAt: null, role: { deletedAt: null } },
          select: { role: { select: { code: true } } },
        },
      },
      orderBy: { name: "asc" },
      take: 100,
    }),
  ]);

  return { orders, callers };
}
