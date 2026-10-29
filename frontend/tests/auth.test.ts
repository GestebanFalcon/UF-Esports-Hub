import { describe, expect, test } from "bun:test";
import { API_BASE_URL, AuthApiError, createAuthClient } from "../src/auth";

const user = {
  id: "b48653da-1234-4567-89ab-123456789abc",
  username: "Gator",
  email: "player@ufl.edu",
  createdAt: "2026-10-20T12:00:00Z",
  updatedAt: "2026-10-20T12:00:00Z",
};
const credentials = { email: user.email, password: " correct horse battery staple " };
const loginBody = { user, accessToken: "test-token", tokenType: "Bearer", expiresIn: 900 };

function setup() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  const calls: { url: string; init?: RequestInit }[] = [];
  let now = 1000;
  let respond = async () => Response.json(loginBody);
  const makeClient = () => createAuthClient({
    storage: () => storage,
    now: () => now,
    request: async (url, init) => {
      calls.push({ url, init });
      return respond();
    },
  });
  return {
    client: makeClient(), makeClient, calls, values,
    advance: (ms: number) => { now += ms; },
    respondWith: (handler: typeof respond) => { respond = handler; },
  };
}

describe("frontend authentication", () => {
  test("login posts credentials, publishes the user, and stores only token metadata", async () => {
    const { client, calls, values } = setup();
    let notifications = 0;
    const unsubscribe = client.subscribe(() => { notifications++; });
    await client.login(credentials);
    expect(calls[0]?.url).toBe(`${API_BASE_URL}/login`);
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual(credentials);
    expect(client.getSnapshot()?.user).toEqual(user);
    expect(client.getSnapshot()?.expiresAt).toBe(901000);
    expect(JSON.parse([...values.values()][0]!)).toEqual({
      accessToken: "test-token", tokenType: "Bearer", expiresAt: 901000,
    });
    expect(notifications).toBe(1);
    unsubscribe();
    client.logout();
    expect(notifications).toBe(1);
  });

  test("server credential and validation errors do not create a session", async () => {
    for (const status of [400, 401, 429]) {
      const { client, respondWith, values } = setup();
      respondWith(async () => Response.json({
        message: "Please check your login information.",
        fieldErrors: { password: ["Password must be at most 72 bytes."] },
      }, { status }));
      try {
        await client.login(credentials);
        throw new Error("Expected login to fail");
      } catch (error) {
        expect(error).toBeInstanceOf(AuthApiError);
        expect((error as AuthApiError).status).toBe(status);
        expect((error as AuthApiError).fieldErrors.password).toEqual(["Password must be at most 72 bytes."]);
      }
      expect(client.getSnapshot()).toBeNull();
      expect(values.size).toBe(0);
    }
  });

  test("malformed success and non-JSON failure responses do not create a session", async () => {
    for (const response of [Response.json({ user }), new Response("Unavailable", { status: 503 })]) {
      const { client, respondWith, values } = setup();
      respondWith(async () => response);
      await expect(client.login(credentials)).rejects.toBeInstanceOf(AuthApiError);
      expect(client.getSnapshot()).toBeNull();
      expect(values.size).toBe(0);
    }
  });

  test("reload restores the user only after /me verifies the saved Bearer token", async () => {
    const { client, makeClient, respondWith, calls } = setup();
    await client.login(credentials);
    const reloaded = makeClient();
    expect(reloaded.getSnapshot()).toBeNull();
    respondWith(async () => Response.json({ user: { ...user, username: "UpdatedGator" } }));
    await reloaded.restore();
    expect(calls[1]?.url).toBe(`${API_BASE_URL}/me`);
    expect(new Headers(calls[1]?.init?.headers).get("Authorization")).toBe("Bearer test-token");
    expect(reloaded.getSnapshot()?.user.username).toBe("UpdatedGator");
  });

  test("expired or malformed saved credentials are removed without an API request", async () => {
    const { client, makeClient, advance, calls, values } = setup();
    await client.login(credentials);
    advance(900000);
    await makeClient().restore();
    expect(calls.length).toBe(1);
    expect(values.size).toBe(0);
    values.set("uf-esports-hub.auth", "not JSON");
    await makeClient().restore();
    expect(values.size).toBe(0);
    expect(calls.length).toBe(1);
  });

  test("a rejected saved token is cleared; a network failure can be retried", async () => {
    const { client, makeClient, respondWith, values } = setup();
    await client.login(credentials);
    const reloaded = makeClient();
    respondWith(async () => { throw new TypeError("Failed to fetch"); });
    await expect(reloaded.restore()).rejects.toThrow("Failed to fetch");
    expect(reloaded.getSnapshot()).toBeNull();
    expect(values.size).toBe(1);
    respondWith(async () => Response.json({ message: "Invalid token" }, { status: 401 }));
    await reloaded.restore();
    expect(reloaded.getSnapshot()).toBeNull();
    expect(values.size).toBe(0);
  });

  test("protected calls send the Bearer token and clear the session on 401", async () => {
    const { client, calls, respondWith, values } = setup();
    await client.login(credentials);
    respondWith(async () => Response.json({ message: "Expired" }, { status: 401 }));
    const response = await client.authenticatedFetch("/me", { headers: { Accept: "application/json" } });
    expect(response.status).toBe(401);
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer test-token");
    expect(headers.get("Accept")).toBe("application/json");
    expect(client.getSnapshot()).toBeNull();
    expect(values.size).toBe(0);
  });

  test("expired sessions and logout prevent subsequent protected calls", async () => {
    const { client, calls, advance, values } = setup();
    await client.login(credentials);
    advance(900000);
    await expect(client.authenticatedFetch("/me")).rejects.toBeInstanceOf(AuthApiError);
    expect(calls.length).toBe(1);
    expect(client.getSnapshot()).toBeNull();
    expect(values.size).toBe(0);
    await client.login(credentials);
    client.logout();
    expect(values.size).toBe(0);
    await expect(client.authenticatedFetch("/me")).rejects.toBeInstanceOf(AuthApiError);
    expect(calls.length).toBe(2);
  });

  test("late login and restoration responses cannot undo logout", async () => {
    const { client, makeClient, respondWith, values } = setup();
    let resolve!: (response: Response) => void;
    respondWith(() => new Promise<Response>((done) => { resolve = done; }));
    const pending = client.login(credentials);
    client.logout();
    resolve(Response.json(loginBody));
    await pending;
    expect(client.getSnapshot()).toBeNull();
    expect(values.size).toBe(0);

    respondWith(async () => Response.json(loginBody));
    await client.login(credentials);
    const reloaded = makeClient();
    respondWith(() => new Promise<Response>((done) => { resolve = done; }));
    const restoring = reloaded.restore();
    reloaded.logout();
    resolve(Response.json({ user }));
    await restoring;
    expect(reloaded.getSnapshot()).toBeNull();
    expect(values.size).toBe(0);
  });

  test("disabled browser storage still allows login and logout in memory", async () => {
    const client = createAuthClient({
      storage: () => { throw new Error("Storage disabled"); },
      request: async () => Response.json(loginBody),
    });
    await client.restore();
    await client.login(credentials);
    expect(client.getSnapshot()?.user).toEqual(user);
    client.logout();
    expect(client.getSnapshot()).toBeNull();
  });
});
