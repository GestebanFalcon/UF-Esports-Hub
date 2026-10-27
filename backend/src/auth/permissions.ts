import type { UserRole } from "@uf-esports-hub/shared";

export type Permission =
  | "view"
  | "manage_profile"
  | "join_team"
  | "manage_team"
  | "manage_roster"
  | "schedule_match"
  | "update_results"
  | "manage_tournament"
  | "manage_roles"
  | "manage_content";

const rolePermissions: Record<UserRole, Permission[]> = {
  player: [
    "view",
    "manage_profile",
    "join_team",
  ],
  manager: [
    "view",
    "manage_profile",
    "manage_team",
    "manage_roster",
    "schedule_match",
    "update_results",
    "manage_tournament",
  ],
  admin: [
    "view",
    "manage_profile",
    "join_team",
    "manage_team",
    "manage_roster",
    "schedule_match",
    "update_results",
    "manage_tournament",
    "manage_roles",
    "manage_content",
  ],
};
// checking if a role has the requested permission

export function hasPermission(
  role: UserRole,
  permission: Permission,
): boolean {
  return rolePermissions[role].includes(permission);
}
