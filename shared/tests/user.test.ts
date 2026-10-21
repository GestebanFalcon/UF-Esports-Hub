import { describe, expect, test } from "bun:test";
import {
  registerSchema,
  toUser,
  userRecordSchema,
  userSchema,
  type UserRecord,
} from "../src/index";

const record: UserRecord = {
  id: "b48653da-1234-4567-89ab-123456789abc",
  username: "GatorPlayer",
  email: "player@ufl.edu",
  hashedPassword: "already-hashed-value",
  createdAt: new Date("2026-10-20T12:00:00.000Z"),
  updatedAt: new Date("2026-10-20T12:00:00.000Z"),
};

describe("user contracts", () => {
  test("validates registration and reports password confirmation errors", () => {
    const input = {
      username: "GatorPlayer",
      email: "player@ufl.edu",
      password: "gator-password",
      confirmPassword: "gator-password",
    };
    expect(registerSchema.safeParse(input).success).toBe(true);
    expect(
      registerSchema.safeParse({ ...input, password: "short" }).success,
    ).toBe(false);
    const mismatch = registerSchema.safeParse({
      ...input,
      confirmPassword: "different-password",
    });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success)
      expect(mismatch.error.issues[0]?.path).toEqual(["confirmPassword"]);
  });
  test("validates database records and requires hashedPassword", () => {
    expect(userRecordSchema.safeParse(record).success).toBe(true);
    expect(
      userRecordSchema.safeParse({ ...record, hashedPassword: "" }).success,
    ).toBe(false);
    expect(
      userRecordSchema.safeParse({
        ...record,
        createdAt: record.createdAt.toISOString(),
      }).success,
    ).toBe(false);
  });

  test("serializes database dates and strips hashes from API data", () => {
    const user = toUser(record);
    expect(user.createdAt).toBe("2026-10-20T12:00:00.000Z");
    expect(user).not.toHaveProperty("hashedPassword");
    expect(
      userSchema.parse({ ...user, hashedPassword: record.hashedPassword }),
    ).not.toHaveProperty("hashedPassword");
    expect(userSchema.parse(JSON.parse(JSON.stringify(user)))).toEqual(user);
  });

  test("rejects malformed identities and timestamps", () => {
    const user = toUser(record);
    for (const invalid of [
      { id: "invalid" },
      { username: "  " },
      { email: "invalid" },
      { createdAt: "yesterday" },
      { updatedAt: new Date() },
    ]) {
      expect(userSchema.safeParse({ ...user, ...invalid }).success).toBe(false);
    }
  });
});
