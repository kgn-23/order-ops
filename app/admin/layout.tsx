import type { ReactNode } from "react";
import {
  LayoutDashboardIcon,
  ListIcon,
  LogOutIcon,
  PhoneCallIcon,
  ScrollTextIcon,
  ShoppingBagIcon,
  UsersIcon,
  WebhookIcon,
} from "lucide-react";

import { requireRole } from "@/lib/auth";
import { RoleDashboardShell } from "@/components/roles/role-dashboard-shell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireRole(["ADMIN"]);

  return (
    <RoleDashboardShell
      session={session}
      brand={{ title: "KGN Order Ops", href: "/admin/dashboard" }}
      navMain={[
        { title: "Dashboard", url: "/admin/dashboard", icon: <LayoutDashboardIcon /> },
        { title: "Tracking Orders", url: "/admin/orders", icon: <ListIcon /> },
        { title: "Shopify Orders", url: "/admin/orders/commerce", icon: <ShoppingBagIcon /> },
        { title: "Call Logs", url: "/admin/call-logs", icon: <PhoneCallIcon /> },
        { title: "Team", url: "/admin/team", icon: <UsersIcon /> },
        { title: "Activity", url: "/admin/activity", icon: <ScrollTextIcon /> },
        { title: "Webhooks", url: "/admin/webhooks", icon: <WebhookIcon /> },
      ]}
      navSecondary={[
        { title: "Logout", url: "#", icon: <LogOutIcon />, isLogout: true },
      ]}
    >
      {children}
    </RoleDashboardShell>
  );
}
