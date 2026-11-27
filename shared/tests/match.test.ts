import { describe, expect, test } from "bun:test";
import {
  matchCreateSchema,
  matchErrorSchema,
  matchFieldLimits,
  matchListMaxDays,
  matchListQuerySchema,
  matchListSchema,
  matchParamsSchema,
  matchPaths,
  matchRecordSchema,
  matchResponseSchema,
  matchResultUpdateSchema,
  matchSchema,
  matchStatusSchema,
  matchUpdateSchema,
  toMatch,
  type MatchRecord,
} from "../src/index";

const matchId = "73000000-0000-4000-8000-000000000001";
const teamId = "71000000-0000-4000-8000-000000000001";
const input = {
  teamId,
  opponent: "Seminoles",
  scheduledAt: "2026-12-01T23:00:00.000Z",
  location: "Online",
  notes: "Best of three",
};
const record: MatchRecord = {
  ...input,
  id: matchId,
  scheduledAt: new Date(input.scheduledAt),
  status: "scheduled",
  teamScore: null,
  opponentScore: null,
  createdAt: new Date("2026-11-27T12:00:00.000Z"),
  updatedAt: new Date("2026-11-27T12:00:00.000Z"),
};

describe("match writes", () => {
  test("trims editable text and accepts empty location and notes", () => {
    expect(matchCreateSchema.parse({
      ...input,
      opponent: " Seminoles ",
      location: " Online ",
      notes: " Best of three ",
    })).toEqual(input);
    expect(matchUpdateSchema.parse({ opponent: " Owls ", location: " ", notes: " " }))
      .toEqual({ opponent: "Owls", location: "", notes: "" });
    expect(matchCreateSchema.parse({ ...input, location: "", notes: "" }))
      .toEqual({ ...input, location: "", notes: "" });
  });

  test("requires all create fields and rejects null and blank opponents", () => {
    for (const field of Object.keys(input)) {
      expect(matchCreateSchema.safeParse({ ...input, [field]: undefined }).success).toBe(false);
      expect(matchCreateSchema.safeParse({ ...input, [field]: null }).success).toBe(false);
      expect(matchUpdateSchema.safeParse({ [field]: null }).success).toBe(false);
    }
    for (const opponent of ["", " \t\n "]) {
      expect(matchCreateSchema.safeParse({ ...input, opponent }).success).toBe(false);
      expect(matchUpdateSchema.safeParse({ opponent }).success).toBe(false);
    }
  });

  test("enforces text limits on creates and updates", () => {
    for (const field of ["opponent", "location", "notes"] as const) {
      const atLimit = "x".repeat(matchFieldLimits[field]);
      const tooLong = `${atLimit}x`;
      expect(matchCreateSchema.safeParse({ ...input, [field]: atLimit }).success).toBe(true);
      expect(matchUpdateSchema.safeParse({ [field]: atLimit }).success).toBe(true);
      expect(matchCreateSchema.safeParse({ ...input, [field]: tooLong }).success).toBe(false);
      expect(matchUpdateSchema.safeParse({ [field]: tooLong }).success).toBe(false);
    }
  });

  test("requires UUID team identity and UTC scheduling instants", () => {
    expect(matchCreateSchema.safeParse({ ...input, teamId: "bad-id" }).success).toBe(false);
    for (const scheduledAt of [
      "2026-12-01", "2026-12-01T18:00:00", "2026-12-01T18:00:00-05:00",
      "2026-02-30T23:00:00Z", "tomorrow", 123, new Date(input.scheduledAt),
    ]) {
      expect(matchCreateSchema.safeParse({ ...input, scheduledAt }).success).toBe(false);
      expect(matchUpdateSchema.safeParse({ scheduledAt }).success).toBe(false);
    }
    // Historical scheduling supports result entry; future-only rules are not part of validation.
    expect(matchCreateSchema.safeParse({ ...input, scheduledAt: "2020-01-01T00:00:00Z" }).success)
      .toBe(true);
  });

  test("rejects protected, result, and unknown scheduling fields", () => {
    for (const field of [
      "id", "managerId", "userId", "role", "createdAt", "updatedAt", "result",
      "teamScore", "opponentScore", "unexpected",
    ]) {
      expect(matchCreateSchema.safeParse({ ...input, [field]: matchId }).success).toBe(false);
      expect(matchUpdateSchema.safeParse({ notes: "Edited", [field]: matchId }).success).toBe(false);
    }
    expect(matchCreateSchema.safeParse({ ...input, status: "scheduled" }).success).toBe(false);
    expect(matchUpdateSchema.safeParse({ teamId }).success).toBe(false);
  });

  test("requires a defined PATCH field and reserves completion for result writes", () => {
    expect(matchUpdateSchema.safeParse({}).success).toBe(false);
    expect(matchUpdateSchema.safeParse({ opponent: undefined, notes: undefined }).success).toBe(false);
    expect(matchUpdateSchema.parse({ notes: "" })).toEqual({ notes: "" });
    for (const status of ["scheduled", "cancelled"]) {
      expect(matchUpdateSchema.parse({ status })).toEqual({ status });
    }
    for (const status of ["completed", "in_progress", "", null]) {
      expect(matchUpdateSchema.safeParse({ status }).success).toBe(false);
    }
  });

  test("result replacement requires both nonnegative integer scores, including zero and draws", () => {
    for (const score of [0, 1, matchFieldLimits.score]) {
      const result = { teamScore: score, opponentScore: score };
      expect(matchResultUpdateSchema.parse(result)).toEqual(result);
    }
    for (const field of ["teamScore", "opponentScore"]) {
      for (const value of [-1, 1.5, matchFieldLimits.score + 1, NaN, Infinity, "1", null, undefined]) {
        expect(matchResultUpdateSchema.safeParse({
          teamScore: 2, opponentScore: 0, [field]: value,
        }).success).toBe(false);
      }
    }
    expect(matchResultUpdateSchema.safeParse({}).success).toBe(false);
  });

  test("result replacement rejects scheduling, ownership, and unknown fields", () => {
    for (const field of [
      ...Object.keys(input), "id", "status", "managerId", "role", "result", "updatedAt", "unexpected",
    ]) {
      expect(matchResultUpdateSchema.safeParse({
        teamScore: 2, opponentScore: 0, [field]: matchId,
      }).success).toBe(false);
    }
  });
});

describe("match reads", () => {
  test("serializes scheduling time and selects the exact public fields", () => {
    const response = { ...input, id: matchId, status: "scheduled", result: null };
    expect(toMatch(record)).toEqual(response);
    expect(matchResponseSchema.parse({
      ...response,
      teamScore: null,
      opponentScore: null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      email: "private@example.invalid",
      hashedPassword: "secret",
      manager: { email: "private@example.invalid" },
      team: { members: [{ email: "private@example.invalid" }] },
    })).toEqual(response);
    expect(matchListSchema.parse({ matches: [JSON.parse(JSON.stringify(response))], internal: true }))
      .toEqual({ matches: [response] });
    expect(matchListSchema.parse({ matches: [] })).toEqual({ matches: [] });
  });

  test("serializes completed scores without losing zero and strips nested result metadata", () => {
    const completed: MatchRecord = { ...record, status: "completed", teamScore: 0, opponentScore: 0 };
    const response = toMatch(completed);
    expect(response.result).toEqual({ teamScore: 0, opponentScore: 0 });
    expect(matchResponseSchema.parse({
      ...response, result: { ...response.result, updatedBy: teamId, email: "private@example.invalid" },
    })).toEqual(response);
  });

  test("read schemas preserve stored text and require internal Date objects", () => {
    const saved = { ...record, opponent: " Seminoles ", location: " Online ", notes: " Saved " };
    expect(matchRecordSchema.parse(saved)).toEqual(saved);
    const response = toMatch(saved);
    expect(response.opponent).toBe(saved.opponent);
    expect(response.location).toBe(saved.location);
    expect(response.notes).toBe(saved.notes);
    expect(matchSchema.parse(response)).toEqual(response);
    for (const field of ["scheduledAt", "createdAt", "updatedAt"] as const) {
      expect(matchRecordSchema.safeParse({ ...record, [field]: record[field].toISOString() }).success)
        .toBe(false);
    }
    expect(matchSchema.safeParse({ ...response, scheduledAt: record.scheduledAt }).success).toBe(false);
    expect(matchSchema.safeParse({ ...response, opponent: "   " }).success).toBe(false);
    expect(matchSchema.safeParse({
      ...response, opponent: ` ${"x".repeat(matchFieldLimits.opponent)} `,
    }).success).toBe(false);
  });

  test("public responses and stored records enforce result lifecycle consistency", () => {
    const response = toMatch(record);
    for (const status of matchStatusSchema.options) {
      for (const result of [null, { teamScore: 2, opponentScore: 1 }]) {
        const valid = (status === "completed") === (result !== null);
        expect(matchSchema.safeParse({ ...response, status, result }).success).toBe(valid);
        expect(matchRecordSchema.safeParse({
          ...record, status, teamScore: result?.teamScore ?? null, opponentScore: result?.opponentScore ?? null,
        }).success).toBe(valid);
      }
      for (const scores of [{ teamScore: 1, opponentScore: null }, { teamScore: null, opponentScore: 1 }]) {
        expect(matchRecordSchema.safeParse({ ...record, status, ...scores }).success).toBe(false);
        expect(() => toMatch({ ...record, status, ...scores })).toThrow();
      }
    }
    expect(matchSchema.safeParse({ ...response, status: "unknown" }).success).toBe(false);
  });
});

describe("match route contracts", () => {
  test("defines escaped paths, strict UUID parameters, and consistent errors", () => {
    expect(matchPaths.list).toBe("/api/matches");
    expect(matchPaths.detail(matchId)).toBe(`/api/matches/${matchId}`);
    expect(matchPaths.result(matchId)).toBe(`/api/matches/${matchId}/result`);
    expect(matchPaths.detail("a/b")).toBe("/api/matches/a%2Fb");
    expect(matchPaths.result("a/b")).toBe("/api/matches/a%2Fb/result");
    expect(matchParamsSchema.parse({ id: matchId })).toEqual({ id: matchId });
    expect(matchParamsSchema.safeParse({ id: "bad-id" }).success).toBe(false);
    expect(matchParamsSchema.safeParse({ id: matchId, teamId }).success).toBe(false);
    const error = { message: "Invalid match fields.", fieldErrors: { opponent: ["Required"] } };
    expect(matchErrorSchema.parse(error)).toEqual(error);
  });

  test("calendar queries require ordered UTC bounds and optionally filter by team", () => {
    const query = { from: "2026-12-01T00:00:00Z", to: "2027-01-01T00:00:00Z" };
    expect(matchListQuerySchema.parse(query)).toEqual(query);
    expect(matchListQuerySchema.parse({ ...query, teamId })).toEqual({ ...query, teamId });
    for (const invalid of [
      {}, { from: query.from }, { to: query.to }, { ...query, to: query.from },
      { from: query.to, to: query.from }, { ...query, teamId: "bad-id" },
      { ...query, status: "scheduled" }, { ...query, from: [query.from] },
      { ...query, from: "2026-12-01T00:00:00" },
    ]) {
      expect(matchListQuerySchema.safeParse(invalid).success).toBe(false);
    }
  });

  test("calendar queries compare instants and enforce the maximum window", () => {
    const from = "2026-12-01T00:00:00.000Z";
    const end = Date.parse(from) + matchListMaxDays * 24 * 60 * 60 * 1000;
    expect(matchListQuerySchema.safeParse({ from, to: new Date(end).toISOString() }).success).toBe(true);
    expect(matchListQuerySchema.safeParse({ from, to: new Date(end + 1).toISOString() }).success).toBe(false);
    expect(matchListQuerySchema.safeParse({ from, to: "2026-12-01T00:00:00Z" }).success).toBe(false);
  });
});
