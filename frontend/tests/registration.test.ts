import { expect, test } from "bun:test";
import { AUTH_API_URL } from "../src/config/api";
import { AuthApiError, registerAccount } from "../src/features/auth/api";

const input = { username: "Gator", email: "player@ufl.edu", password: "password123" };
const user = {
  id: "b48653da-1234-4567-89ab-123456789abc",
  username: input.username,
  email: input.email,
  createdAt: "2026-10-20T12:00:00Z",
  updatedAt: "2026-10-20T12:00:00Z",
};

test("registration posts the API contract and returns a validated public user", async () => {
  const result = await registerAccount(input, async (url, init) => {
    expect(url).toBe(`${AUTH_API_URL}/register`);
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(init?.body as string)).toEqual(input);
    return Response.json({ user: { ...user, hashedPassword: "must-not-escape" } }, { status: 201 });
  });
  expect(result).toEqual(user);
});

test("registration preserves duplicate-account field errors for the form", async () => {
  try {
    await registerAccount(input, async () => Response.json({
      message: "Email is already registered.",
      fieldErrors: { email: ["This email is already in use."] },
    }, { status: 409 }));
    throw new Error("Expected registration to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(AuthApiError);
    expect((error as AuthApiError).status).toBe(409);
    expect((error as AuthApiError).fieldErrors.email).toEqual(["This email is already in use."]);
  }
});

test("registration rejects invalid success responses and handles non-JSON server errors", async () => {
  for (const response of [Response.json({ user: {} }), new Response("Unavailable", { status: 503 })]) {
    await expect(registerAccount(input, async () => response)).rejects.toBeInstanceOf(AuthApiError);
  }
});

test("registration connection failures reach the form without a false success", async () => {
  await expect(registerAccount(input, async () => {
    throw new TypeError("Failed to fetch");
  })).rejects.toThrow("Failed to fetch");
});
