import type { ReactNode } from "react";
import { LayoutDashboardIcon, ListIcon, LogOutIcon, PhoneCallIcon, ShoppingBagIcon } from "lucide-react";

import { requireRole } from "@/lib/auth";
import { RoleDashboardShell } from "@/components/roles/role-dashboard-shell";

export default async function CallerLayout({ children }: { children: ReactNode }) {
  const session = await requireRole(["ADMIN", "MANAGER", "CALLER"]);

  return (
    <RoleDashboardShell
      session={session}
      brand={{ title: "KGN Order Ops", href: "/caller/dashboard" }}
      navMain={[
        { title: "Dashboard", url: "/caller/dashboard", icon: <LayoutDashboardIcon /> },
        { title: "Tracking Orders", url: "/caller/orders", icon: <ListIcon /> },
        { title: "Shopify Orders", url: "/caller/orders/commerce", icon: <ShoppingBagIcon /> },
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
