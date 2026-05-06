import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { NavDocuments } from "@/components/nav-documents";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Package2Icon } from "lucide-react";

export type CrmSidebarNavItem = {
  title: string;
  url: string;
  icon?: ReactNode;
};

export type CrmSidebarDocItem = {
  name: string;
  url: string;
  icon: ReactNode;
};

export type AppSidebarProps = ComponentProps<typeof Sidebar> & {
  brand: { title: string; href: string };
  user: { name: string; email: string; avatar?: string };
  navMain: CrmSidebarNavItem[];
  documents?: CrmSidebarDocItem[];
  navSecondary?: CrmSidebarNavItem[];
  showQuickCreate?: boolean;
};

export function AppSidebar({
  brand,
  user,
  navMain,
  documents = [],
  navSecondary = [],
  showQuickCreate = false,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href={brand.href}>
                <Package2Icon className="size-5!" />
                <span className="text-base font-semibold">{brand.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} showQuickCreate={showQuickCreate} />
        {documents.length > 0 ? <NavDocuments items={documents} /> : null}
        {navSecondary.length > 0 ? (
          <NavSecondary items={navSecondary} className="mt-auto" />
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
