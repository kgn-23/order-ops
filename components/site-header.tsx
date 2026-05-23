"use client";

import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

function titleFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? "dashboard";
  if (last === "dashboard") return "Dashboard";
  if (last === "orders") return "Orders";
  if (last === "team") return "Team";
  if (last === "activity") return "Activity";
  if (last === "webhooks") return "Webhooks";
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ");
}

export function SiteHeader({ roles }: { roles?: readonly string[] }) {
  const pathname = usePathname();
  const title = titleFromPath(pathname);

  return (
    <header className="sticky top-0 z-40 flex h-(--header-height) min-w-0 shrink-0 items-center gap-2 border-b bg-background/90 backdrop-blur-md transition-[width,height] ease-linear supports-[backdrop-filter]:bg-background/75 group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full min-w-0 items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <ThemeToggle />
          {roles?.length
            ? roles.map((role) => (
                <Badge key={role} variant="secondary">
                  {role}
                </Badge>
              ))
            : null}
        </div>
      </div>
    </header>
  );
}
