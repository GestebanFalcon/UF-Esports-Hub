import { z } from "zod";

/** Provisional PBI-10 contracts: reconcile with team schema issue #15. */
export const teamPaths = { list: "/api/teams", detail: (id: string) => `/api/teams/${id}` } as const;
export const teamCreateSchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
  game: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500),
});
export const teamUpdateSchema = teamCreateSchema.partial().refine(
  data => Object.keys(data).length > 0, "At least one field is required",
);
export const teamResponseSchema = teamCreateSchema.extend({
  id: z.uuid(),
  managerId: z.uuid(),
});
export const teamListSchema = z.object({ teams: z.array(teamResponseSchema) });
export type TeamCreate = z.infer<typeof teamCreateSchema>;
export type TeamUpdate = z.infer<typeof teamUpdateSchema>;
export type TeamResponse = z.infer<typeof teamResponseSchema>;
