import { describe, expect, test } from "bun:test";
import { hasPermission } from "../src/auth/permissions";

describe("permissions", () => {
  test("players can view and edit their profile", () => {
    expect(hasPermission("player", "view")).toBe(true);
    expect(hasPermission("player", "manage_profile")).toBe(true);
  });

  test("players can join teams", () => {
    expect(hasPermission("player", "join_team")).toBe(true);
  });

  test("players cannot manage teams or rosters", () => {
    expect(hasPermission("player", "manage_team")).toBe(false);
    expect(hasPermission("player", "manage_roster")).toBe(false);
  });

  test("managers can manage teams and rosters", () => {
    expect(hasPermission("manager", "manage_team")).toBe(true);
    expect(hasPermission("manager", "manage_roster")).toBe(true);
  });

  test("managers cannot manage roles", () => {
    expect(hasPermission("manager", "manage_roles")).toBe(false);
  });

  test("admins can manage roles and content", () => {
    expect(hasPermission("admin", "manage_roles")).toBe(true);
    expect(hasPermission("admin", "manage_content")).toBe(true);
  });
});
