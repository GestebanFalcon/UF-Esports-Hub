import { z } from "zod";

/** PBI-6 provisional contract; reconcile with PBI-4 (#12) before integration. */
export const profilePaths = {
  self: "/api/me/profile",
} as const;

export const profileUpdateSchema = z.strictObject({
  displayName: z.string().trim().min(1).max(50),
  favoriteGame: z.string().trim().max(60),
  bio: z.string().trim().max(300),
});

export const profileResponseSchema = z.strictObject({
  userId: z.uuid(),
  displayName: z.string(),
  favoriteGame: z.string(),
  bio: z.string(),
  updatedAt: z.iso.datetime(),
});
export const profileErrorSchema = z.object({
  message: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
export type ProfileResponse = z.infer<typeof profileResponseSchema>;
