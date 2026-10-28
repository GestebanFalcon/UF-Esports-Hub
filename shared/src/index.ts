export { userSchema, userRecordSchema, toUser } from "./user.js";
export type { User, UserRecord } from "./user.js";
export {
  registerSchema,
  registerRequestSchema,
  registerResponseSchema,
  loginSchema,
  loginRequestSchema,
  loginResponseSchema,
  authErrorSchema,
} from "./auth.js";
export type {
  RegisterInput,
  RegisterRequest,
  RegisterResponse,
  LoginInput,
  LoginRequest,
  LoginResponse,
  AuthError,
} from "./auth.js";

// PBI-6 self-profile API (provisional until issue #12 is integrated).
export { profilePaths, profileUpdateSchema, profileResponseSchema, profileErrorSchema } from "./profile.js";
export type { ProfileUpdate, ProfileResponse } from "./profile.js";
