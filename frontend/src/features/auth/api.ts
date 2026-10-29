import {
  authErrorSchema,
  registerRequestSchema,
  registerResponseSchema,
  type RegisterRequest,
} from "@uf-esports-hub/shared";
import { AUTH_API_URL } from "../../config/api";

export type AuthRequest = (url: string, init?: RequestInit) => Promise<Response>;

export class AuthApiError extends Error {
  constructor(
    message: string,
    public fieldErrors: Record<string, string[]> = {},
    public status?: number,
  ) {
    super(message);
  }
}

export async function readAuthResponse(response: Response): Promise<unknown> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = authErrorSchema.safeParse(body);
    throw new AuthApiError(
      error.success ? error.data.message : "The request failed. Please try again.",
      error.success ? error.data.fieldErrors : undefined,
      response.status,
    );
  }
  return body;
}

export async function registerAccount(input: RegisterRequest, request: AuthRequest = fetch) {
  const response = await request(`${AUTH_API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(registerRequestSchema.parse(input)),
  });
  const result = registerResponseSchema.safeParse(await readAuthResponse(response));
  if (!result.success) throw new AuthApiError("The server returned an unexpected response.");
  return result.data.user;
}
