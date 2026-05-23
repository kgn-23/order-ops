import { formatIstCalendarDateString, parseOptionalIstDateParam } from "@/lib/ist-time";

export type StorefrontDashboardSearchParams = {
  from: string;
  to: string;
  teamId?: string;
};

export function parseStorefrontDashboardSearchParams(
  params: Record<string, string | string[] | undefined>,
): StorefrontDashboardSearchParams {
  const today = formatIstCalendarDateString();
  const from = parseOptionalIstDateParam(
    typeof params.from === "string" ? params.from : params.from?.[0],
  );
  const to = parseOptionalIstDateParam(
    typeof params.to === "string" ? params.to : params.to?.[0],
  );
  const teamRaw = typeof params.teamId === "string" ? params.teamId : params.teamId?.[0];
  const teamId = teamRaw?.trim() ? teamRaw.trim() : undefined;

  return {
    from: from ?? today,
    to: to ?? today,
    ...(teamId ? { teamId } : {}),
  };
}

export function storefrontDashboardQueryString(
  state: StorefrontDashboardSearchParams,
): string {
  const sp = new URLSearchParams();
  sp.set("from", state.from);
  sp.set("to", state.to);
  if (state.teamId) sp.set("teamId", state.teamId);
  return sp.toString();
}
