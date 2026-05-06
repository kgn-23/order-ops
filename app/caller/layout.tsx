import type { ReactNode } from "react";
import { LayoutDashboardIcon, ListIcon, LogOutIcon, PhoneCallIcon } from "lucide-react";

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
        { title: "Call Logs", url: "/caller/call-logs", icon: <PhoneCallIcon /> },
      ]}
      navSecondary={[
        { title: "Logout", url: "#", icon: <LogOutIcon />, isLogout: true },
      ]}
    >
      {children}
    </RoleDashboardShell>
  );
}
