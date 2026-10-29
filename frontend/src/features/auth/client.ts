import {
  loginRequestSchema,
  loginResponseSchema,
  registerResponseSchema,
  type LoginRequest,
} from "@uf-esports-hub/shared";

import { AUTH_API_URL } from "../../config/api";
import { AuthApiError, readAuthResponse, type AuthRequest } from "./api";
import type { Credentials, Session, SessionStorage } from "./types";

const STORAGE_KEY = "uf-esports-hub.auth";

export function createAuthClient(options: {
  storage: () => SessionStorage | null;
  request?: AuthRequest;
  now?: () => number;
}) {
  const request = options.request ?? ((url, init) => fetch(url, init));
  const now = options.now ?? Date.now;
  const listeners = new Set<() => void>();
  let session: Session | null = null;
  let revision = 0;

  function persist(credentials: Credentials | null) {
    try {
      const storage = options.storage();
      if (credentials) storage?.setItem(STORAGE_KEY, JSON.stringify(credentials));
      else storage?.removeItem(STORAGE_KEY);
    } catch {
      // Browsers can disable storage; the current in-memory session still works.
    }
  }

  function update(next: Session | null) {
    session = next;
    persist(next && {
      accessToken: next.accessToken,
      tokenType: next.tokenType,
      expiresAt: next.expiresAt,
    });
    listeners.forEach((listener) => listener());
  }

  function logout() {
    revision++;
    update(null);
  }

  function readCredentials(): Credentials | null {
    try {
      const stored = options.storage()?.getItem(STORAGE_KEY);
      if (!stored) return null;
      const data = JSON.parse(stored);
      const token = loginResponseSchema.pick({ accessToken: true, tokenType: true }).safeParse(data);
      if (token.success && Number.isFinite(data.expiresAt) && data.expiresAt > now()) {
        return { ...token.data, expiresAt: data.expiresAt };
      }
    } catch {
      // Treat unavailable storage or malformed saved credentials as signed out.
    }
    persist(null);
    return null;
  }

  async function login(input: LoginRequest) {
    const body = loginRequestSchema.parse(input);
    const attempt = ++revision;
    // Count from request start so latency cannot extend the advertised lifetime.
    const startedAt = now();
    const response = await request(`${AUTH_API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = loginResponseSchema.safeParse(await readAuthResponse(response));
    if (!result.success) throw new AuthApiError("The server returned an unexpected response.");
    const { expiresIn, ...data } = result.data;
    const next = { ...data, expiresAt: startedAt + expiresIn * 1000 };
    if (next.expiresAt <= now()) throw new AuthApiError("Your session expired. Please log in again.");
    if (attempt === revision) update(next);
  }

  async function restore() {
    const attempt = ++revision;
    const credentials = readCredentials();
    if (!credentials) return;
    try {
      const response = await request(`${AUTH_API_URL}/me`, {
        headers: { Authorization: `${credentials.tokenType} ${credentials.accessToken}` },
      });
      const result = registerResponseSchema.safeParse(await readAuthResponse(response));
      if (!result.success) throw new AuthApiError("The server returned an unexpected response.");
      if (attempt === revision) {
        if (credentials.expiresAt <= now()) logout();
        else update({ ...credentials, user: result.data.user });
      }
    } catch (error) {
      if (attempt === revision && error instanceof AuthApiError && error.status === 401) {
        logout();
        return;
      }
      throw error;
    }
  }

  // Use this for future protected API calls; never attach a token to arbitrary origins.
  async function authenticatedFetch(path: `/${string}`, init?: RequestInit) {
    const current = session;
    if (!current || current.expiresAt <= now()) {
      logout();
      throw new AuthApiError("Your session expired. Please log in again.", {}, 401);
    }
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `${current.tokenType} ${current.accessToken}`);
    const response = await request(`${AUTH_API_URL}${path}`, { ...init, headers });
    if (response.status === 401 && session === current) logout();
    return response;
  }

  return {
    login,
    restore,
    logout,
    authenticatedFetch,
    getSnapshot: () => session,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

export const authClient = createAuthClient({ storage: () => window.sessionStorage });
