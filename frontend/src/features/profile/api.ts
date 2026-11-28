import {
  profileFieldLimits,
  profilePaths,
  profileResponseSchema,
  type ProfileResponse,
} from "@uf-esports-hub/shared";
import { apiUrl } from "../../config/api";
import { authClient } from "../auth/client";

/** Never treat browser-local values as persisted profile data. */
export const profilePath = profilePaths.self;
export type PlayerProfile = ProfileResponse;
export type ProfileEdits = { [Field in keyof PlayerProfile]: NonNullable<PlayerProfile[Field]> };
export type ProfileField = keyof ProfileEdits;
export type ProfileErrors = Partial<Record<ProfileField, string>>;
export type ApiFailure = { message?: string; fieldErrors?: Record<string, string[]> };

export class ProfileApiError extends Error {
  constructor(public status: number, message: string, public fieldErrors: ProfileErrors = {}) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export function parseProfile(value: unknown): PlayerProfile {
  const result = profileResponseSchema.safeParse(value);
  if (!result.success) {
    throw new ProfileApiError(502, "The server returned an invalid player profile.");
  }
  return result.data;
}
export function validateProfile(draft: ProfileEdits): ProfileErrors {
  const errors: ProfileErrors = {};
  if (!draft.displayName.trim()) errors.displayName = "Display name is required.";
  else if (draft.displayName.trim().length > profileFieldLimits.displayName) errors.displayName = `Use ${profileFieldLimits.displayName} characters or fewer.`;
  if (draft.favoriteGame.trim().length > profileFieldLimits.favoriteGame) errors.favoriteGame = `Use ${profileFieldLimits.favoriteGame} characters or fewer.`;
  if (draft.bio.trim().length > profileFieldLimits.bio) errors.bio = `Use ${profileFieldLimits.bio} characters or fewer.`;
  return errors;
}
async function requestProfile(method: "GET" | "PATCH", edits?: ProfileEdits, signal?: AbortSignal): Promise<PlayerProfile> {
  const session = authClient.getSnapshot();
  if (!session || session.expiresAt <= Date.now()) {
    authClient.logout();
    throw new ProfileApiError(401, "Sign in to view your player profile.");
  }
  let response: Response;
  try {
    response = await fetch(apiUrl(profilePath), {
      method, signal,
      headers: {
        Accept: "application/json",
        Authorization: `${session.tokenType} ${session.accessToken}`,
        ...(edits ? { "Content-Type": "application/json" } : {}),
      },
      ...(edits ? { body: JSON.stringify(edits) } : {}),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ProfileApiError(0, "Unable to contact the profile server. Try again later.");
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && authClient.getSnapshot() === session) authClient.logout();
    const data = isRecord(payload) ? payload as ApiFailure : {};
    const fieldErrors: ProfileErrors = {};
    if (isRecord(data.fieldErrors)) {
      for (const field of ["displayName", "favoriteGame", "bio"] as const) {
        const messages = data.fieldErrors[field];
        if (Array.isArray(messages) && typeof messages[0] === "string") fieldErrors[field] = messages[0];
      }
    }
    const fallback = response.status === 401 ? "Sign in to view your player profile."
      : response.status === 403 ? "You don't have permission to access this profile."
      : response.status === 404 ? "Your player profile is not available yet."
      : response.status === 400 ? "Please correct the highlighted fields."
      : "The profile request failed. Please try again.";
    throw new ProfileApiError(response.status,
      typeof data.message === "string" ? data.message : fallback, fieldErrors);
  }
  return parseProfile(payload);
}
export const getMyProfile = (signal?: AbortSignal) => requestProfile("GET", undefined, signal);
export const saveMyProfile = (edits: ProfileEdits) => requestProfile("PATCH", edits);
