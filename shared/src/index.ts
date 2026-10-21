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
