export const API_ORIGIN = (
  process.env.BUN_PUBLIC_API_ORIGIN?.trim() || "http://localhost:3001"
).replace(/\/+$/, "");

export function apiUrl(path: `/api/${string}`): string {
  return `${API_ORIGIN}${path}`;
}

export const AUTH_API_URL = apiUrl("/api/auth");
