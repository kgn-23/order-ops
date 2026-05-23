import type { ActivityLogSort } from "@/lib/activity-params";
import { db } from "@/lib/db";

export async function getActivityLogsPage(input: {
  page: number;
  pageSize: number;
  sort: ActivityLogSort;
  actionContains?: string;
  entityTypeContains?: string;
}) {
  const { page, pageSize, sort, actionContains, entityTypeContains } = input;
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.min(100, Math.max(10, Math.floor(pageSize)));

  const where = {
    deletedAt: null,
    ...(actionContains?.trim()
      ? { action: { contains: actionContains.trim(), mode: "insensitive" as const } }
      : {}),
    ...(entityTypeContains?.trim()
      ? {
          entityType: { contains: entityTypeContains.trim(), mode: "insensitive" as const },
        }
      : {}),
  };

  const orderBy =
    sort === "createdAt_desc"
      ? { createdAt: "desc" as const }
      : sort === "createdAt_asc"
        ? { createdAt: "asc" as const }
        : sort === "action_asc"
          ? { action: "asc" as const }
          : sort === "action_desc"
            ? { action: "desc" as const }
            : sort === "entityType_asc"
              ? { entityType: "asc" as const }
              : { entityType: "desc" as const };

  const [total, rows] = await Promise.all([
    db.activityLog.count({ where }),
    db.activityLog.findMany({
      where,
      orderBy,
      skip: (safePage - 1) * safeSize,
      take: safeSize,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        actor: { select: { name: true } },
        order: { select: { customerName: true, trackingNumber: true } },
      },
    }),
  ]);

  return { rows, total, page: safePage, pageSize: safeSize };
}
