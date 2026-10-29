import { z } from "zod";

export const profileFieldLimits = {
  displayName: 40,
  favoriteGame: 60,
  bio: 500,
} as const;

const displayNameSchema = z.string().min(1).max(profileFieldLimits.displayName)
  .refine((value) => value.trim().length > 0, "Display name is required");
const favoriteGameSchema = z.string().max(profileFieldLimits.favoriteGame);
const bioSchema = z.string().max(profileFieldLimits.bio);

// this is the profile info that can be shown publicly
export const profileSchema = z.object({
  displayName: displayNameSchema,
  favoriteGame: favoriteGameSchema.nullable(),
  bio: bioSchema.nullable(),
});
export type Profile = z.infer<typeof profileSchema>;

// only these profile fields can be changed
export const profileUpdateSchema = z.object({
  displayName: displayNameSchema.optional(),
  favoriteGame: favoriteGameSchema.nullable().optional(),
  bio: bioSchema.nullable().optional(),
}).strict().refine((input) => Object.keys(input).length > 0, "Provide at least one profile field");
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

// this shape matches a row saved in the database
export const profileRecordSchema = z.object({
  userId: z.uuid(),
  ...profileSchema.shape,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ProfileRecord = z.infer<typeof profileRecordSchema>;

// this only returns profile info, not the user id or timestamps
export function toProfile(record: ProfileRecord): Profile {
  return profileSchema.parse({
    displayName: record.displayName,
    favoriteGame: record.favoriteGame,
    bio: record.bio,
  });
}
