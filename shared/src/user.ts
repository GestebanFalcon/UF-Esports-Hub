import { z } from "zod";
// available roles for users in the application
export const userRoles = ["player", "manager", "admin"] as const;
export type UserRole = (typeof userRoles)[number];

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
  role: z.enum(userRoles),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type User = z.infer<typeof userSchema>;

/** Internal database row; never return this directly from an API. */
export const userRecordSchema = z.object({
  ...userIdentity,
  role: z.enum(userRoles),
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
    role: record.role,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });
}
