import type { ReactNode } from "react";
import {
  CircleHelpIcon,
  LayoutDashboardIcon,
  ListIcon,
  ScrollTextIcon,
  UsersIcon,
  WebhookIcon,
} from "lucide-react";

import { requireRole } from "@/app/lib/auth";
import { RoleDashboardShell } from "@/components/roles/role-dashboard-shell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireRole(["ADMIN"]);

  return (
    <RoleDashboardShell
      session={session}
      brand={{ title: "KGN Order Ops", href: "/admin/dashboard" }}
      navMain={[
        { title: "Dashboard", url: "/admin/dashboard", icon: <LayoutDashboardIcon /> },
        { title: "Orders", url: "/admin/orders", icon: <ListIcon /> },
        { title: "Team", url: "/admin/team", icon: <UsersIcon /> },
        { title: "Activity", url: "/admin/activity", icon: <ScrollTextIcon /> },
        { title: "Webhooks", url: "/admin/webhooks", icon: <WebhookIcon /> },
      ]}
      navSecondary={[
        { title: "Get help", url: "mailto:support@example.com", icon: <CircleHelpIcon /> },
      ]}
    >
      {children}
    </RoleDashboardShell>
  );
}
