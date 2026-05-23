import { StorefrontAnalyticsDashboard } from "@/components/dashboard/storefront-analytics-dashboard";
import { requireRole } from "@/lib/auth";
import { parseStorefrontDashboardSearchParams } from "@/lib/dashboard/search-params";
import { getStorefrontDashboardPayload } from "@/lib/dashboard/storefront-analytics";
import {
  listTeamsForDashboardFilter,
  resolveStorefrontDashboardScope,
} from "@/lib/dashboard/storefront-scope";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  const session = await requireRole(["ADMIN"]);
  const params = await searchParams;
  const applied = parseStorefrontDashboardSearchParams(params);
  const [scope, teamFilterOptions] = await Promise.all([
    resolveStorefrontDashboardScope(session, applied.teamId),
    listTeamsForDashboardFilter(),
  ]);
  const data = await getStorefrontDashboardPayload(scope, applied, teamFilterOptions);

  return (
    <StorefrontAnalyticsDashboard
      basePath="/admin/dashboard"
      applied={applied}
      data={data}
      showTeamFilter
    />
  );
}
