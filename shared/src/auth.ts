import { z } from "zod";
import { userSchema } from "./user.js";

/** Registration API body; confirmation is a form concern and is stripped. */
export const registerRequestSchema = userSchema
  .pick({ username: true, email: true })
  .extend({
    password: z.string().min(8, "Use at least 8 characters"),
  });

/** Registration form includes password confirmation before creating a request. */
export const registerSchema = registerRequestSchema
  .extend({
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/** Login must accept existing passwords without imposing registration policy. */
export const loginRequestSchema = userSchema.pick({ email: true }).extend({
  password: z.string().min(1, "Enter your password"),
});
export const loginSchema = loginRequestSchema;

/** Success bodies returned by the backend authentication routes. */
export const registerResponseSchema = z.object({ user: userSchema });
export const loginResponseSchema = z.object({
  user: userSchema,
  accessToken: z.string().min(1),
  tokenType: z.literal("Bearer"),
  expiresIn: z.number().int().positive(),
});
export const authErrorSchema = z.object({
  message: z.string().min(1),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type RegisterResponse = z.infer<typeof registerResponseSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type AuthError = z.infer<typeof authErrorSchema>;
