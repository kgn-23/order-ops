import { StorefrontAnalyticsDashboard } from "@/components/dashboard/storefront-analytics-dashboard";
import { requireRole } from "@/lib/auth";
import { parseStorefrontDashboardSearchParams } from "@/lib/dashboard/search-params";
import { getStorefrontDashboardPayload } from "@/lib/dashboard/storefront-analytics";
import { resolveStorefrontDashboardScope } from "@/lib/dashboard/storefront-scope";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ManagerDashboardPage({ searchParams }: PageProps) {
  const session = await requireRole(["MANAGER"]);
  const params = await searchParams;
  const applied = parseStorefrontDashboardSearchParams(params);
  const scope = await resolveStorefrontDashboardScope(session);
  const data = await getStorefrontDashboardPayload(scope, applied, []);

  return (
    <StorefrontAnalyticsDashboard
      basePath="/manager/dashboard"
      applied={applied}
      data={data}
      showTeamFilter={false}
    />
  );
}
