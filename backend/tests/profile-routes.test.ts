import { describe, expect, test } from "bun:test";
import express, { type RequestHandler } from "express";
import { createProfileRouter, type ProfileStore } from "../src/routes/profile/index.js";
import { profilePaths, type ProfileResponse } from "@uf-esports-hub/shared";

const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";
const fixture = (userId: string): ProfileResponse => ({
  userId, displayName: userId === ALICE ? "Alice" : "Bob",
  favoriteGame: "Valorant", bio: "Player", updatedAt: "2026-10-28T12:00:00.000Z",
});

async function setup(initial = true) {
  const records = new Map<string, ProfileResponse>();
  if (initial) { records.set(ALICE, fixture(ALICE)); records.set(BOB, fixture(BOB)); }
  const store: ProfileStore = {
    async getByUserId(id) { return records.get(id) ?? null; },
    async updateByUserId(id, values) {
      const original = records.get(id);
      if (!original) return null;
      const next = { ...original, ...values, updatedAt: new Date().toISOString() };
      records.set(id, next);
      return next;
    },
  };
  // Test-only authentication. Real integration MUST use #10 verified JWT middleware.
  const authenticate: RequestHandler = (req, res, next) => {
    const token = req.headers.authorization;
    if (token === "Bearer test-alice") res.locals.authenticatedUserId = ALICE;
    else if (token === "Bearer test-bob") res.locals.authenticatedUserId = BOB;
    else { res.status(401).json({ message: "Authentication required." }); return; }
    next();
  };
  const app = express();
  app.use(express.json());
  app.use(profilePaths.self, createProfileRouter({ authenticate, store }));
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Server did not start");
  const url = `http://127.0.0.1:${address.port}${profilePaths.self}`;
  async function request(method: string, body?: unknown, token = "test-alice") {
    return fetch(url, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  return { request, records, close: () => new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve())) };
}

describe("PBI-6 self profile endpoints", () => {
  test("reads only the authenticated user's profile", async () => {
    const ctx = await setup();
    try {
      const alice = await ctx.request("GET");
      expect(alice.status).toBe(200);
      expect((await alice.json()).userId).toBe(ALICE);
      const bob = await ctx.request("GET", undefined, "test-bob");
      expect((await bob.json()).userId).toBe(BOB);
    } finally { await ctx.close(); }
  });

  test("rejects missing and invalid authentication", async () => {
    const ctx = await setup();
    try {
      expect((await ctx.request("GET", undefined, "")).status).toBe(401);
      expect((await ctx.request("PATCH", { displayName: "X", favoriteGame: "", bio: "" }, "invalid")).status).toBe(401);
    } finally { await ctx.close(); }
  });

  test("persists own changes without touching other player", async () => {
    const ctx = await setup();
    try {
      const changed = await ctx.request("PATCH", { displayName: "New Alice", favoriteGame: "Dota", bio: "Updated" });
      expect(changed.status).toBe(200);
      expect((await changed.json()).displayName).toBe("New Alice");
      expect((await (await ctx.request("GET")).json()).favoriteGame).toBe("Dota");
      expect(ctx.records.get(BOB)?.displayName).toBe("Bob");
    } finally { await ctx.close(); }
  });

  test("rejects ownership, account fields, and invalid profile fields", async () => {
    const ctx = await setup();
    try {
      for (const patch of [
        { userId: BOB, displayName: "Hack", favoriteGame: "", bio: "" },
        { role: "admin", displayName: "Hack", favoriteGame: "", bio: "" },
        { email: "new@ufl.edu", displayName: "Hack", favoriteGame: "", bio: "" },
        { displayName: "", favoriteGame: "", bio: "" },
        { displayName: "A".repeat(51), favoriteGame: "", bio: "" },
      ]) expect((await ctx.request("PATCH", patch)).status).toBe(400);
      expect(ctx.records.get(ALICE)?.displayName).toBe("Alice");
      expect(ctx.records.get(BOB)?.displayName).toBe("Bob");
    } finally { await ctx.close(); }
  });

  test("missing profile returns 404 for read and update", async () => {
    const ctx = await setup(false);
    try {
      expect((await ctx.request("GET")).status).toBe(404);
      expect((await ctx.request("PATCH", { displayName: "Alice", favoriteGame: "", bio: "" })).status).toBe(404);
      expect(ctx.records.size).toBe(0);
    } finally { await ctx.close(); }
  });

  test("database failures return 500 without exposing sensitive errors", async () => {
    const authenticate: RequestHandler = (_req, res, next) => { res.locals.authenticatedUserId = ALICE; next(); };
    const failing: ProfileStore = {
      async getByUserId() { throw Error("private database secret"); },
      async updateByUserId() { throw Error("private database secret"); },
    };
    const app = express();
    app.use(express.json());
    app.use(profilePaths.self, createProfileRouter({ authenticate, store: failing }));
    const server = app.listen(0);
    try {
      const addr = server.address();
      if (!addr || typeof addr === "string") throw Error("No port");
      const res = await fetch(`http://127.0.0.1:${addr.port}${profilePaths.self}`);
      expect(res.status).toBe(500);
      expect(await res.text()).not.toContain("private database secret");
    } finally { await new Promise<void>(r => server.close(() => r())); }
  });
});
