/** PBI-5 client. Mirrors provisional PBI-6 contract until shared #12/#13 merges.
 * Never treat browser-local values as persisted profile data.
 */
export const profilePath = "/api/me/profile";
export type PlayerProfile = {
  userId: string;
  displayName: string;
  favoriteGame: string;
  bio: string;
  updatedAt: string;
};
export type ProfileEdits = Pick<PlayerProfile, "displayName" | "favoriteGame" | "bio">;
export type ProfileField = keyof ProfileEdits;
export type ProfileErrors = Partial<Record<ProfileField, string>>;
export type ApiFailure = { message?: string; fieldErrors?: Record<string, string[]> };

export class ProfileApiError extends Error {
  constructor(public status: number, message: string, public fieldErrors: ProfileErrors = {}) {
    super(message);
  }
}
const apiBase = (import.meta.env?.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:3001";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export function parseProfile(value: unknown): PlayerProfile {
  if (!isRecord(value) || typeof value.userId !== "string" ||
      typeof value.displayName !== "string" || typeof value.favoriteGame !== "string" ||
      typeof value.bio !== "string" || typeof value.updatedAt !== "string" ||
      !Number.isFinite(Date.parse(value.updatedAt))) {
    throw new ProfileApiError(502, "The server returned an invalid player profile.");
  }
  return { userId: value.userId, displayName: value.displayName,
    favoriteGame: value.favoriteGame, bio: value.bio, updatedAt: value.updatedAt };
}
export function validateProfile(draft: ProfileEdits): ProfileErrors {
  const errors: ProfileErrors = {};
  if (!draft.displayName.trim()) errors.displayName = "Display name is required.";
  else if (draft.displayName.trim().length > 50) errors.displayName = "Use 50 characters or fewer.";
  if (draft.favoriteGame.trim().length > 60) errors.favoriteGame = "Use 60 characters or fewer.";
  if (draft.bio.trim().length > 300) errors.bio = "Use 300 characters or fewer.";
  return errors;
}
async function requestProfile(method: "GET" | "PATCH", edits?: ProfileEdits, signal?: AbortSignal): Promise<PlayerProfile> {
  let response: Response;
  try {
    response = await fetch(`${apiBase}${profilePath}`, {
      method, credentials: "include", signal,
      headers: { Accept: "application/json", ...(edits ? { "Content-Type": "application/json" } : {}) },
      ...(edits ? { body: JSON.stringify(edits) } : {}),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ProfileApiError(0, "Unable to contact the profile server. Try again later.");
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
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
