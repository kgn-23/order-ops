import type { ReactNode } from "react";
import { CircleHelpIcon, LayoutDashboardIcon, ListIcon } from "lucide-react";

import { requireRole } from "@/app/lib/auth";
import { RoleDashboardShell } from "@/components/roles/role-dashboard-shell";

export default async function CallerLayout({ children }: { children: ReactNode }) {
  const session = await requireRole(["ADMIN", "MANAGER", "CALLER"]);

  return (
    <RoleDashboardShell
      session={session}
      brand={{ title: "KGN Order Ops", href: "/caller/dashboard" }}
      navMain={[
        { title: "Dashboard", url: "/caller/dashboard", icon: <LayoutDashboardIcon /> },
        { title: "Orders", url: "/caller/orders", icon: <ListIcon /> },
      ]}
      navSecondary={[
        { title: "Get help", url: "mailto:support@example.com", icon: <CircleHelpIcon /> },
      ]}
    >
      {children}
    </RoleDashboardShell>
  );
}
