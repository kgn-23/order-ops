import { ActivityLogsView } from "@/components/activity/activity-logs-view";
import { parseActivitySearchParams } from "@/app/lib/activity-params";
import { getActivityLogsPage } from "@/app/server/queries";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ManagerActivityPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const applied = parseActivitySearchParams(sp);
  const data = await getActivityLogsPage({
    page: applied.page,
    pageSize: applied.pageSize,
    sort: applied.sort,
    actionContains: applied.action || undefined,
    entityTypeContains: applied.entityType || undefined,
  });

  const rows = data.rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <ActivityLogsView
      basePath="/manager/activity"
      rows={rows}
      total={data.total}
      applied={applied}
    />
  );
}
