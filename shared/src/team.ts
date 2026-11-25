import { z } from "zod";
import { profileSchema, type ProfileRecord } from "./profile.js";

export const teamPaths = {
  list: "/api/teams",
  detail: (id: string) => `/api/teams/${encodeURIComponent(id)}`,
  roster: (id: string) => `/api/teams/${encodeURIComponent(id)}/roster`,
} as const;

export const teamFieldLimits = {
  name: 100,
  game: 80,
  description: 500,
} as const;

const nameSchema = z.string().min(1).max(teamFieldLimits.name)
  .refine((value) => value.trim().length > 0, "Team name is required");
const gameSchema = z.string().min(1).max(teamFieldLimits.game)
  .refine((value) => value.trim().length > 0, "Game is required");
const descriptionSchema = z.string().max(teamFieldLimits.description);

// Public team data. Reading a team preserves its saved values.
export const teamSchema = z.object({
  id: z.uuid(),
  name: nameSchema,
  game: gameSchema,
  description: descriptionSchema,
  managerId: z.uuid(),
});
export type Team = z.infer<typeof teamSchema>;

// Create and update responses share the same public team fields.
export const teamResponseSchema = teamSchema;
export type TeamResponse = z.infer<typeof teamResponseSchema>;

export const teamListSchema = z.object({ teams: z.array(teamResponseSchema) });
export type TeamList = z.infer<typeof teamListSchema>;

export const teamErrorSchema = z.object({
  message: z.string().min(1),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});
export type TeamError = z.infer<typeof teamErrorSchema>;

export const teamParamsSchema = z.object({ id: z.uuid() }).strict();
export type TeamParams = z.infer<typeof teamParamsSchema>;

// Trim form input on writes. The server supplies managerId from verified auth.
export const teamCreateSchema = z.object({
  name: z.string().trim().min(1).max(teamFieldLimits.name),
  game: z.string().trim().min(1).max(teamFieldLimits.game),
  description: z.string().trim().max(teamFieldLimits.description),
}).strict();
export type TeamCreate = z.infer<typeof teamCreateSchema>;

export const teamUpdateSchema = teamCreateSchema.partial().refine(
  (input) => input.name !== undefined || input.game !== undefined || input.description !== undefined,
  "Provide at least one team field",
);
export type TeamUpdate = z.infer<typeof teamUpdateSchema>;

// Database timestamps stay internal and use Date objects.
export const teamRecordSchema = teamSchema.extend({
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type TeamRecord = z.infer<typeof teamRecordSchema>;

export const teamMembershipRecordSchema = z.object({
  teamId: z.uuid(),
  playerId: z.uuid(),
  joinedAt: z.date(),
});
export type TeamMembershipRecord = z.infer<typeof teamMembershipRecordSchema>;

// Rosters only need each player's identity and public display name.
export const teamRosterMemberSchema = z.object({
  playerId: z.uuid(),
  displayName: profileSchema.shape.displayName,
});
export type TeamRosterMember = z.infer<typeof teamRosterMemberSchema>;

export const teamRosterSchema = z.object({ members: z.array(teamRosterMemberSchema) });
export type TeamRoster = z.infer<typeof teamRosterSchema>;

// Explicitly select public fields instead of returning the database row.
export function toTeam(record: TeamRecord): Team {
  return teamSchema.parse({
    id: record.id,
    name: record.name,
    game: record.game,
    description: record.description,
    managerId: record.managerId,
  });
}

export function toTeamRosterMember(record: ProfileRecord): TeamRosterMember {
  return teamRosterMemberSchema.parse({
    playerId: record.userId,
    displayName: record.displayName,
  });
}
