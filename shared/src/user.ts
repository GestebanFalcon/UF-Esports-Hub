import { z } from "zod";

const userIdentity = {
  id: z.uuid(),
  username: z
    .string()
    .min(1)
    .refine((value) => value.trim().length > 0, "Username is required"),
  email: z.email(),
};

/** User data sent over JSON. Unknown fields (including password hashes) are stripped. */
export const userSchema = z.object({
  ...userIdentity,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type User = z.infer<typeof userSchema>;

/** Internal database row; never return this directly from an API. */
export const userRecordSchema = z.object({
  ...userIdentity,
  hashedPassword: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserRecord = z.infer<typeof userRecordSchema>;

/** Explicitly serializes timestamps and removes internal fields. */
export function toUser(record: UserRecord): User {
  return userSchema.parse({
    id: record.id,
    username: record.username,
    email: record.email,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });
}
