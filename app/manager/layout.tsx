import type { ReactNode } from "react";
import { CircleHelpIcon, LayoutDashboardIcon, ListIcon, ScrollTextIcon } from "lucide-react";

import { requireRole } from "@/app/lib/auth";
import { RoleDashboardShell } from "@/components/roles/role-dashboard-shell";

export default async function ManagerLayout({ children }: { children: ReactNode }) {
  const session = await requireRole(["ADMIN", "MANAGER"]);

  return (
    <RoleDashboardShell
      session={session}
      brand={{ title: "KGN Order Ops", href: "/manager/dashboard" }}
      navMain={[
        { title: "Dashboard", url: "/manager/dashboard", icon: <LayoutDashboardIcon /> },
        { title: "Orders", url: "/manager/orders", icon: <ListIcon /> },
        { title: "Activity", url: "/manager/activity", icon: <ScrollTextIcon /> },
      ]}
      navSecondary={[
        { title: "Get help", url: "mailto:support@example.com", icon: <CircleHelpIcon /> },
      ]}
    >
      {children}
    </RoleDashboardShell>
  );
}
