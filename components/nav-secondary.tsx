"use client";

import Link from "next/link";
import * as React from "react";
import { logout } from "@/app/actions/auth";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string;
    url: string;
    icon?: React.ReactNode;
    isLogout?: boolean;
  }[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.isLogout ? (
                <SidebarMenuButton asChild>
                  <form action={logout} className="w-full">
                    <button type="submit" className="flex w-full items-center gap-2 text-left">
                      {item.icon ?? null}
                      <span>{item.title}</span>
                    </button>
                  </form>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton asChild>
                  <Link href={item.url}>
                    {item.icon ?? null}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
