import { expect, test } from "bun:test";
import {
  authErrorSchema,
  loginRequestSchema,
  loginResponseSchema,
  registerRequestSchema,
  registerResponseSchema,
  registerSchema,
} from "../src/index";

test("login requires a valid email and nonempty password without changing it", () => {
  const input = { email: "player@ufl.edu", password: " x " };
  expect(loginRequestSchema.parse(input)).toEqual(input);
  expect(loginRequestSchema.safeParse({ ...input, password: "" }).success).toBe(
    false,
  );
  expect(
    loginRequestSchema.safeParse({ ...input, email: "invalid" }).success,
  ).toBe(false);
});

test("registration API strips confirmation and client-supplied internal fields", () => {
  const form = {
    username: "Gator",
    email: "player@ufl.edu",
    password: "password123",
    confirmPassword: "password123",
  };
  expect(registerSchema.safeParse(form).success).toBe(true);
  const request = registerRequestSchema.parse({
    ...form,
    hashedPassword: "client-hash",
    id: "client-id",
  });
  expect(request).toEqual({
    username: form.username,
    email: form.email,
    password: form.password,
  });
  expect(
    registerRequestSchema.safeParse({ ...form, password: "short" }).success,
  ).toBe(false);
  expect(
    registerSchema.safeParse({ ...form, confirmPassword: "different" }).success,
  ).toBe(false);
});

test("auth responses validate the public user and remove hashes", () => {
  const response = {
    user: {
      id: "b48653da-1234-4567-89ab-123456789abc",
      username: "Gator",
      email: "player@ufl.edu",
      role: "player",
      createdAt: "2026-10-20T12:00:00.000Z",
      updatedAt: "2026-10-20T12:00:00.000Z",
      hashedPassword: "secret",
    },
  };
  for (const schema of [loginResponseSchema, registerResponseSchema]) {
    expect(schema.parse(response).user).not.toHaveProperty("hashedPassword");
    expect(
      schema.safeParse({ user: { ...response.user, id: "invalid" } }).success,
    ).toBe(false);
  }
  expect(
    authErrorSchema.safeParse({
      message: "Check your input",
      fieldErrors: { email: ["Invalid email"] },
    }).success,
  ).toBe(true);
});
