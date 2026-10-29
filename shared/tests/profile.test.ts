import { describe, expect, test } from "bun:test";
import {
  profileRecordSchema,
  profileSchema,
  profileUpdateSchema,
  toProfile,
  type ProfileRecord,
} from "../src/index";

const record: ProfileRecord = {
  userId: "b48653da-1234-4567-89ab-123456789abc",
  displayName: "GatorPlayer",
  favoriteGame: "Rocket League",
  bio: "UF Esports player",
  createdAt: new Date("2026-10-20T12:00:00.000Z"),
  updatedAt: new Date("2026-10-20T12:00:00.000Z"),
};

describe("player profile contracts", () => {
  // check the profile field lengths and which values can be empty
  test("enforces field limits and optional database values", () => {
    expect(profileSchema.safeParse({ displayName: "D", favoriteGame: null, bio: null }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ displayName: "x".repeat(40) }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ displayName: "x".repeat(41) }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ favoriteGame: "x".repeat(60) }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ favoriteGame: "x".repeat(61) }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ bio: "x".repeat(500) }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ bio: "x".repeat(501) }).success).toBe(false);
    expect(profileSchema.safeParse({ displayName: "  ", favoriteGame: null, bio: null }).success).toBe(false);
  });

  // make sure profile updates cannot change account details
  test("rejects unknown and protected update fields", () => {
    for (const field of ["userId", "role", "email", "password", "hashedPassword", "unexpected"]) {
      expect(profileUpdateSchema.safeParse({ displayName: "Gator", [field]: "value" }).success).toBe(false);
    }
    expect(profileUpdateSchema.safeParse({}).success).toBe(false);
  });

  // make sure public profile data leaves out private database fields
  test("validates stored rows and serializes only public profile fields", () => {
    expect(profileRecordSchema.safeParse(record).success).toBe(true);
    const profile = toProfile(record);
    expect(profile).toEqual({ displayName: "GatorPlayer", favoriteGame: "Rocket League", bio: "UF Esports player" });
    expect(profile).not.toHaveProperty("userId");
    expect(profile).not.toHaveProperty("createdAt");
    expect(profileSchema.parse(JSON.parse(JSON.stringify(profile)))).toEqual(profile);
  });
});
