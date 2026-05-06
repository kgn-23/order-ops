"use client";

import type { CSSProperties, ReactNode } from "react";

import type { AppSession } from "@/app/lib/auth";
import { AppSidebar, type CrmSidebarDocItem, type CrmSidebarNavItem } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export type RoleDashboardShellProps = {
  children: ReactNode;
  session: AppSession;
  brand: { title: string; href: string };
  navMain: CrmSidebarNavItem[];
  documents?: CrmSidebarDocItem[];
  navSecondary?: CrmSidebarNavItem[];
  showQuickCreate?: boolean;
};

export function RoleDashboardShell({
  children,
  session,
  brand,
  navMain,
  documents,
  navSecondary,
  showQuickCreate,
}: RoleDashboardShellProps) {
  return (
    <TooltipProvider>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as CSSProperties
        }
      >
        <AppSidebar
          brand={brand}
          user={{ name: session.name, email: session.email }}
          navMain={navMain}
          documents={documents}
          navSecondary={navSecondary}
          showQuickCreate={showQuickCreate}
        />
        <SidebarInset>
          <SiteHeader roles={session.roles} />
          <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
