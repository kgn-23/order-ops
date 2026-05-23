"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import type { StorefrontDashboardSearchParams } from "@/lib/dashboard/search-params";
import { storefrontDashboardQueryString } from "@/lib/dashboard/search-params";
import {
  detectIstDateRangePreset,
  getIstDateRangeForPreset,
  IST_DATE_RANGE_PRESET_LABELS,
  IST_DATE_RANGE_PRESETS,
  type IstDateRangePreset,
} from "@/lib/ist-time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StorefrontDashboardFiltersProps = {
  basePath: string;
  applied: StorefrontDashboardSearchParams;
  teamOptions: Array<{ id: string; name: string }>;
  showTeamFilter: boolean;
  scopeLabel: string;
  rangeLabel: string;
};

export function StorefrontDashboardFilters({
  basePath,
  applied,
  teamOptions,
  showTeamFilter,
  scopeLabel,
  rangeLabel,
}: StorefrontDashboardFiltersProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(applied);

  const appliedPreset = useMemo(
    () => detectIstDateRangePreset(applied.from, applied.to),
    [applied.from, applied.to],
  );

  useEffect(() => {
    setDraft(applied);
  }, [applied]);

  const apply = () => {
    startTransition(() => {
      router.push(`${basePath}?${storefrontDashboardQueryString(draft)}`);
    });
  };

  const applyPreset = (preset: IstDateRangePreset) => {
    const range = getIstDateRangeForPreset(preset);
    const next = { ...draft, from: range.from, to: range.to };
    setDraft(next);
    startTransition(() => {
      router.push(`${basePath}?${storefrontDashboardQueryString(next)}`);
    });
  };

  const periodSelectValue = appliedPreset === "custom" ? "custom" : appliedPreset;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Shopify / storefront analytics</p>
          <p className="text-xs text-muted-foreground">
            {scopeLabel} · {rangeLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="dash-period" className="sr-only">
            Period
          </Label>
          <Select
            value={periodSelectValue}
            onValueChange={(v) => {
              if (v === "custom") return;
              applyPreset(v as IstDateRangePreset);
            }}
            disabled={pending}
          >
            <SelectTrigger id="dash-period" className="w-[10.5rem]" aria-label="Date period">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              {IST_DATE_RANGE_PRESETS.map((preset) => (
                <SelectItem key={preset} value={preset}>
                  {IST_DATE_RANGE_PRESET_LABELS[preset]}
                </SelectItem>
              ))}
              {appliedPreset === "custom" ? (
                <SelectItem value="custom" disabled>
                  Custom range
                </SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="dash-from">From</Label>
          <Input
            id="dash-from"
            type="date"
            value={draft.from}
            onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
            className="w-full min-w-[10rem] sm:w-auto"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dash-to">To</Label>
          <Input
            id="dash-to"
            type="date"
            value={draft.to}
            onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
            className="w-full min-w-[10rem] sm:w-auto"
          />
        </div>
        {showTeamFilter ? (
          <div className="space-y-1.5">
            <Label>Team</Label>
            <Select
              value={draft.teamId ?? "all"}
              onValueChange={(v) =>
                setDraft((d) => ({
                  ...d,
                  teamId: v === "all" ? undefined : v,
                }))
              }
            >
              <SelectTrigger className="w-full min-w-[12rem] sm:w-[200px]">
                <SelectValue placeholder="All teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All teams</SelectItem>
                {teamOptions.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <Button type="button" onClick={apply} disabled={pending} className="sm:mb-0.5">
          {pending ? "Applying…" : "Apply filters"}
        </Button>
      </div>
    </div>
  );
}
