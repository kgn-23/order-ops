import type { AppRole } from "@/app/lib/auth";

export type RoleSection = "admin" | "manager" | "caller";

export const ROLE_SECTION_ACCESS: Record<RoleSection, AppRole[]> = {
  admin: ["ADMIN"],
  manager: ["ADMIN", "MANAGER"],
  caller: ["ADMIN", "MANAGER", "CALLER"],
};

export function getDefaultSection(roles: AppRole[]): RoleSection {
  if (roles.includes("ADMIN")) return "admin";
  if (roles.includes("MANAGER")) return "manager";
  return "caller";
}
