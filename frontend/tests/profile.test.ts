import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { authClient } from "../src/features/auth/client";
import { getMyProfile, parseProfile, ProfileApiError, saveMyProfile, validateProfile } from "../src/features/profile/api";

const user = {
  id: "b48653da-1234-4567-89ab-123456789abc",
  username: "Gator",
  email: "player@ufl.edu",
  createdAt: "2026-10-20T12:00:00Z",
  updatedAt: "2026-10-20T12:00:00Z",
};
const loginResponse = { user, accessToken: "test-token", tokenType: "Bearer", expiresIn: 900 };
const profile = {
  displayName: "Gator",
  favoriteGame: "Rocket League",
  bio: "Hi",
};

async function signIn() {
  const request = spyOn(globalThis, "fetch").mockResolvedValue(Response.json(loginResponse));
  await authClient.login({ email: user.email, password: "correct horse battery staple" });
  request.mockClear();
  return request;
}

afterEach(() => {
  mock.restore();
  authClient.logout();
});

describe("PBI-5 profile client validation", () => {
  test("accepts valid profile fields", () => {
    expect(validateProfile({ displayName: "Player", favoriteGame: "Valorant", bio: "Hi" })).toEqual({});
  });
  test("requires a display name and enforces limits", () => {
    const result = validateProfile({ displayName: " ", favoriteGame: "x".repeat(61), bio: "y".repeat(501) });
    expect(result.displayName).toBeDefined();
    expect(result.favoriteGame).toBeDefined();
    expect(result.bio).toBeDefined();
  });
  test("accepts the public profile response and excludes extra account fields", () => {
    const p = parseProfile({ userId: "11111111-1111-4111-8111-111111111111",
      displayName: "Gator", favoriteGame: "Rocket League", bio: "Hi",
      updatedAt: "2026-10-28T12:00:00Z", hashedPassword: "never expose" });
    expect(p).toEqual(profile);
    expect("userId" in p).toBe(false);
    expect("updatedAt" in p).toBe(false);
    expect("hashedPassword" in p).toBe(false);
  });
  test("rejects malformed server payloads", () => {
    expect(() => parseProfile({ displayName: "No identity" })).toThrow(ProfileApiError);
  });
  test("accepts nullable profile fields and uses the shared database limits", () => {
    expect(parseProfile({ displayName: "Gator", favoriteGame: null, bio: null })).toEqual({
      displayName: "Gator", favoriteGame: null, bio: null,
    });
    expect(validateProfile({ displayName: "x".repeat(40), favoriteGame: "x".repeat(60), bio: "x".repeat(500) })).toEqual({});
    expect(validateProfile({ displayName: "x".repeat(41), favoriteGame: "", bio: "" }).displayName).toBeDefined();
  });
});

describe("profile session integration", () => {
  test("GET and PATCH send the current session's Bearer token", async () => {
    const request = await signIn();
    request.mockResolvedValue(Response.json(profile));
    expect(await getMyProfile()).toEqual(profile);
    const [url, init] = request.mock.calls[0]!;
    expect(String(url)).toEndWith("/api/me/profile");
    expect(init?.method).toBe("GET");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer test-token");
    expect(init?.credentials).toBeUndefined();

    const edits = { displayName: "New Gator", favoriteGame: "Valorant", bio: "Updated" };
    request.mockResolvedValue(Response.json({ ...profile, ...edits }));
    expect(await saveMyProfile(edits)).toEqual({ ...profile, ...edits });
    const [, patch] = request.mock.calls[1]!;
    expect(patch?.method).toBe("PATCH");
    expect(new Headers(patch?.headers).get("Authorization")).toBe("Bearer test-token");
    expect(new Headers(patch?.headers).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(patch?.body as string)).toEqual(edits);
  });

  test("signed-out and expired sessions do not issue profile requests", async () => {
    const request = spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected request"));
    await expect(getMyProfile()).rejects.toMatchObject({ status: 401 });
    expect(request).not.toHaveBeenCalled();
    request.mockRestore();

    const signedInRequest = await signIn();
    spyOn(Date, "now").mockReturnValue(authClient.getSnapshot()!.expiresAt);
    await expect(getMyProfile()).rejects.toMatchObject({ status: 401 });
    expect(signedInRequest).not.toHaveBeenCalled();
    expect(authClient.getSnapshot()).toBeNull();
  });

  test("401 clears the rejected session; 404 leaves the session available for retry", async () => {
    const request = await signIn();
    request.mockResolvedValueOnce(Response.json({}, { status: 404 }));
    await expect(getMyProfile()).rejects.toMatchObject({ status: 404 });
    expect(authClient.getSnapshot()).not.toBeNull();
    request.mockResolvedValueOnce(Response.json({}, { status: 401 }));
    await expect(getMyProfile()).rejects.toMatchObject({ status: 401 });
    expect(authClient.getSnapshot()).toBeNull();
  });

  test("a late 401 cannot log out a newer session", async () => {
    const request = await signIn();
    let finish!: (response: Response) => void;
    request.mockReturnValueOnce(new Promise<Response>(resolve => { finish = resolve; }));
    const pending = getMyProfile();
    request.mockResolvedValue(Response.json({ ...loginResponse, accessToken: "new-token" }));
    await authClient.login({ email: user.email, password: "correct horse battery staple" });
    finish(Response.json({}, { status: 401 }));
    await expect(pending).rejects.toMatchObject({ status: 401 });
    expect(authClient.getSnapshot()?.accessToken).toBe("new-token");
  });

  test("PATCH validation errors are available to the form", async () => {
    const request = await signIn();
    request.mockResolvedValue(Response.json({
      message: "Please correct the highlighted fields.",
      fieldErrors: { displayName: ["Name unavailable"], bio: ["Too long"] },
    }, { status: 400 }));
    await expect(saveMyProfile({ displayName: "Gator", favoriteGame: "", bio: "" })).rejects.toMatchObject({
      status: 400,
      fieldErrors: { displayName: "Name unavailable", bio: "Too long" },
    });
  });
});
