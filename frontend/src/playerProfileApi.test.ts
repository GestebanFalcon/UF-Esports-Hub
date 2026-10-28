import { describe, expect, test } from "bun:test";
import { parseProfile, ProfileApiError, validateProfile } from "./playerProfileApi";

describe("PBI-5 profile client validation", () => {
  test("accepts valid profile fields", () => {
    expect(validateProfile({ displayName: "Player", favoriteGame: "Valorant", bio: "Hi" })).toEqual({});
  });
  test("requires a display name and enforces limits", () => {
    const result = validateProfile({ displayName: " ", favoriteGame: "x".repeat(61), bio: "y".repeat(301) });
    expect(result.displayName).toBeDefined();
    expect(result.favoriteGame).toBeDefined();
    expect(result.bio).toBeDefined();
  });
  test("accepts the public profile response and excludes extra account fields", () => {
    const p = parseProfile({ userId: "11111111-1111-4111-8111-111111111111",
      displayName: "Gator", favoriteGame: "Rocket League", bio: "Hi",
      updatedAt: "2026-10-28T12:00:00Z", hashedPassword: "never expose" });
    expect("hashedPassword" in p).toBe(false);
  });
  test("rejects malformed server payloads", () => {
    expect(() => parseProfile({ displayName: "No identity" })).toThrow(ProfileApiError);
  });
});
