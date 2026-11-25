import { describe, expect, test } from "bun:test";
import {
  teamSchema,
  teamCreateSchema,
  teamUpdateSchema,
  teamResponseSchema,
  teamListSchema,
  teamRecordSchema,
  teamMembershipRecordSchema,
  teamRosterSchema,
  teamParamsSchema,
  teamPaths,
  teamErrorSchema,
  toTeam,
  toTeamRosterMember,
  type ProfileRecord,
  type TeamRecord,
} from "../src/index";

const teamId = "b48653da-1234-4567-89ab-123456789abc";
const managerId = "b48653da-1234-4567-89ab-123456789abd";
const teamInput = {
  name: "Gators",
  game: "Rocket League",
  description: "Campus team",
};
const record: TeamRecord = {
  ...teamInput,
  id: teamId,
  managerId,
  createdAt: new Date("2026-10-20T12:00:00.000Z"),
  updatedAt: new Date("2026-10-20T12:00:00.000Z"),
};

describe("team contracts", () => {
  test("trims create and update input", () => {
    expect(teamCreateSchema.parse({
      name: " Gators ",
      game: " Rocket League ",
      description: " ",
    })).toEqual({ ...teamInput, description: "" });

    expect(teamUpdateSchema.parse({ name: " New team " })).toEqual({ name: "New team" });
  });

  test("requires create fields, rejects null, and allows an empty description", () => {
    for (const field of ["name", "game", "description"]) {
      expect(teamCreateSchema.safeParse({ ...teamInput, [field]: undefined }).success).toBe(false);
      expect(teamCreateSchema.safeParse({ ...teamInput, [field]: null }).success).toBe(false);
    }

    for (const field of ["name", "game"]) {
      expect(teamCreateSchema.safeParse({ ...teamInput, [field]: "" }).success).toBe(false);
      expect(teamCreateSchema.safeParse({ ...teamInput, [field]: " \t\n " }).success).toBe(false);
    }

    expect(teamCreateSchema.parse({ ...teamInput, description: "" }).description).toBe("");
  });

  test("enforces field limits on creates and updates", () => {
    const fieldLimits = [
      ["name", 100],
      ["game", 80],
      ["description", 500],
    ] as const;

    for (const [field, limit] of fieldLimits) {
      const atLimit = "x".repeat(limit);
      const tooLong = "x".repeat(limit + 1);

      expect(teamCreateSchema.safeParse({ ...teamInput, [field]: atLimit }).success).toBe(true);
      expect(teamUpdateSchema.safeParse({ [field]: atLimit }).success).toBe(true);
      expect(teamCreateSchema.safeParse({ ...teamInput, [field]: tooLong }).success).toBe(false);
      expect(teamUpdateSchema.safeParse({ [field]: tooLong }).success).toBe(false);
    }
  });

  test("rejects protected and unknown fields in writes", () => {
    const protectedFields = [
      "id", "managerId", "ownerId", "userId", "role", "members", "roster",
      "createdAt", "updatedAt", "unexpected",
    ];

    for (const field of protectedFields) {
      expect(teamCreateSchema.safeParse({ ...teamInput, [field]: teamId }).success).toBe(false);
      expect(teamUpdateSchema.safeParse({ name: "Gators", [field]: teamId }).success).toBe(false);
    }
  });

  test("requires a defined update field and allows clearing the description", () => {
    expect(teamUpdateSchema.safeParse({}).success).toBe(false);
    expect(teamUpdateSchema.safeParse({ name: undefined }).success).toBe(false);
    expect(teamUpdateSchema.parse({ description: "" })).toEqual({ description: "" });
  });

  test("read schemas preserve saved text and require database Date timestamps", () => {
    const savedRecord = {
      ...record,
      name: " Gators ",
      game: " Rocket League ",
      description: " Campus team ",
    };

    expect(teamRecordSchema.parse(savedRecord)).toEqual(savedRecord);
    expect(teamSchema.parse(savedRecord)).toEqual(toTeam(savedRecord));
    expect(toTeam(savedRecord).description).toBe(" Campus team ");
    expect(teamRecordSchema.safeParse({
      ...record,
      createdAt: record.createdAt.toISOString(),
    }).success).toBe(false);

    // Read validation must check the stored length before trimming could hide it.
    expect(teamSchema.safeParse({ ...record, name: ` ${"x".repeat(100)} ` }).success).toBe(false);
    expect(teamSchema.safeParse({ ...record, name: "   " }).success).toBe(false);
  });

  test("team responses include only public fields", () => {
    const team = toTeam(record);
    expect(team).toEqual({ ...teamInput, id: teamId, managerId });
    expect(teamResponseSchema.parse({
      ...record,
      email: "private@ufl.edu",
      hashedPassword: "secret",
      role: "admin",
      manager: { email: "private@ufl.edu" },
      memberships: [{ email: "private@ufl.edu" }],
    })).toEqual(team);

    expect(teamListSchema.parse({ teams: [JSON.parse(JSON.stringify(team))] }))
      .toEqual({ teams: [team] });
    expect(teamResponseSchema.safeParse({ ...team, managerId: "bad-id" }).success).toBe(false);
  });

  test("roster responses include only player ID and display name", () => {
    const profile: ProfileRecord = {
      userId: managerId,
      displayName: "Player",
      favoriteGame: "Rocket League",
      bio: "Not needed in a roster response",
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
    const member = toTeamRosterMember(profile);

    expect(member).toEqual({ playerId: managerId, displayName: "Player" });
    expect(teamRosterSchema.parse({
      members: [{ ...member, email: "private@ufl.edu", role: "player" }],
    })).toEqual({ members: [member] });
    expect(teamRosterSchema.parse({ members: [] })).toEqual({ members: [] });
  });

  test("membership records require UUID relationships and a Date timestamp", () => {
    const membership = { teamId, playerId: managerId, joinedAt: record.createdAt };

    expect(teamMembershipRecordSchema.safeParse(membership).success).toBe(true);
    expect(teamMembershipRecordSchema.safeParse({ ...membership, teamId: "bad-id" }).success)
      .toBe(false);
    expect(teamMembershipRecordSchema.safeParse({ ...membership, joinedAt: "yesterday" }).success)
      .toBe(false);
  });

  test("exports route paths, UUID parameters, and consistent errors", () => {
    expect(teamPaths.list).toBe("/api/teams");
    expect(teamPaths.detail(teamId)).toBe(`/api/teams/${teamId}`);
    expect(teamPaths.roster(teamId)).toBe(`/api/teams/${teamId}/roster`);
    expect(teamPaths.detail("a/b")).toBe("/api/teams/a%2Fb");
    expect(teamParamsSchema.safeParse({ id: teamId }).success).toBe(true);
    expect(teamParamsSchema.safeParse({ id: "bad-id" }).success).toBe(false);
    expect(teamErrorSchema.parse({
      message: "Invalid team fields.",
      fieldErrors: { name: ["Required"] },
    })).toEqual({
      message: "Invalid team fields.",
      fieldErrors: { name: ["Required"] },
    });
  });
});
