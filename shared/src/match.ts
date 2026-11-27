import { z } from "zod";

export const matchPaths = {
  list: "/api/matches",
  detail: (id: string) => `/api/matches/${encodeURIComponent(id)}`,
  result: (id: string) => `/api/matches/${encodeURIComponent(id)}/result`,
} as const;

export const matchFieldLimits = {
  opponent: 100,
  location: 200,
  notes: 1000,
  score: 2_147_483_647,
} as const;

export const matchListMaxDays = 93;

export const matchStatusSchema = z.enum(["scheduled", "completed", "cancelled"]);
export type MatchStatus = z.infer<typeof matchStatusSchema>;

const opponentSchema = z.string().min(1).max(matchFieldLimits.opponent)
  .refine((value) => value.trim().length > 0, "Opponent is required");
const scoreSchema = z.number().int().min(0).max(matchFieldLimits.score);
const matchFields = {
  id: z.uuid(),
  teamId: z.uuid(),
  opponent: opponentSchema,
  location: z.string().max(matchFieldLimits.location),
  notes: z.string().max(matchFieldLimits.notes),
  status: matchStatusSchema,
};

export const matchResultSchema = z.object({
  teamScore: scoreSchema,
  opponentScore: scoreSchema,
});
export type MatchResult = z.infer<typeof matchResultSchema>;

// Result writes replace the entire score pair; scheduling writes cannot set scores.
export const matchResultUpdateSchema = matchResultSchema.strict();
export type MatchResultUpdate = z.infer<typeof matchResultUpdateSchema>;

export const matchSchema = z.object({
  ...matchFields,
  scheduledAt: z.iso.datetime(),
  result: matchResultSchema.nullable(),
}).refine(
  (match) => (match.status === "completed") === (match.result !== null),
  { message: "Only completed matches have a result", path: ["result"] },
);
export type Match = z.infer<typeof matchSchema>;

export const matchResponseSchema = matchSchema;
export type MatchResponse = z.infer<typeof matchResponseSchema>;

export const matchListSchema = z.object({ matches: z.array(matchResponseSchema) });
export type MatchList = z.infer<typeof matchListSchema>;

export const matchCreateSchema = z.object({
  teamId: z.uuid(),
  opponent: z.string().trim().min(1).max(matchFieldLimits.opponent),
  scheduledAt: z.iso.datetime(),
  location: z.string().trim().max(matchFieldLimits.location),
  notes: z.string().trim().max(matchFieldLimits.notes),
}).strict();
export type MatchCreate = z.infer<typeof matchCreateSchema>;

export const matchUpdateSchema = matchCreateSchema.omit({ teamId: true }).extend({
  status: matchStatusSchema.exclude(["completed"]),
}).partial().refine(
  (input) => Object.values(input).some((value) => value !== undefined),
  "Provide at least one match field",
);
export type MatchUpdate = z.infer<typeof matchUpdateSchema>;

// Database scores live on the match row; timestamps stay as Date objects internally.
export const matchRecordSchema = z.object({
  ...matchFields,
  scheduledAt: z.date(),
  teamScore: scoreSchema.nullable(),
  opponentScore: scoreSchema.nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
}).refine(
  (match) => match.status === "completed"
    ? match.teamScore !== null && match.opponentScore !== null
    : match.teamScore === null && match.opponentScore === null,
  { message: "Only completed matches have both scores", path: ["teamScore"] },
);
export type MatchRecord = z.infer<typeof matchRecordSchema>;

export const matchParamsSchema = z.object({ id: z.uuid() }).strict();
export type MatchParams = z.infer<typeof matchParamsSchema>;

// Calendar windows use an inclusive start and exclusive end, compared as instants.
export const matchListQuerySchema = z.object({
  from: z.iso.datetime(),
  to: z.iso.datetime(),
  teamId: z.uuid().optional(),
}).strict().refine(
  (query) => {
    const duration = Date.parse(query.to) - Date.parse(query.from);
    return duration > 0 && duration <= matchListMaxDays * 24 * 60 * 60 * 1000;
  },
  { message: `Provide a calendar window of at most ${matchListMaxDays} days`, path: ["to"] },
);
export type MatchListQuery = z.infer<typeof matchListQuerySchema>;

export const matchErrorSchema = z.object({
  message: z.string().min(1),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});
export type MatchError = z.infer<typeof matchErrorSchema>;

export function toMatch(record: MatchRecord): Match {
  return matchSchema.parse({
    id: record.id,
    teamId: record.teamId,
    opponent: record.opponent,
    scheduledAt: record.scheduledAt.toISOString(),
    location: record.location,
    notes: record.notes,
    status: record.status,
    result: record.teamScore === null && record.opponentScore === null ? null : {
      teamScore: record.teamScore,
      opponentScore: record.opponentScore,
    },
  });
}
