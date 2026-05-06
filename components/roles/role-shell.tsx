import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppRole } from "@/app/lib/auth";

type NavItem = {
  href: string;
  label: string;
};

type RoleShellProps = {
  title: string;
  description: string;
  sectionLabel: string;
  roles: AppRole[];
  nav: NavItem[];
  children: React.ReactNode;
};

export function RoleShell({
  title,
  description,
  sectionLabel,
  roles,
  nav,
  children,
}: RoleShellProps) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6">
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="secondary">{roles.join(", ")}</Badge>
        </CardHeader>
      </Card>

      <Card size="sm">
        <CardContent className="flex flex-wrap gap-2 pt-3">
          {nav.map((item) => (
            <Button key={item.href} asChild size="sm" variant="outline">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
          <Badge variant="outline" className="ml-auto">
            {sectionLabel}
          </Badge>
        </CardContent>
      </Card>

      {children}
    </main>
  );
}
