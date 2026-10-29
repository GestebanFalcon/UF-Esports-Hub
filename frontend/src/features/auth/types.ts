import type { User } from "@uf-esports-hub/shared";

export type AuthMode = "login" | "register";
export type FieldErrors = Record<string, string>;
export type Credentials = {
  accessToken: string;
  tokenType: "Bearer";
  expiresAt: number;
};
export type Session = Credentials & { user: User };
export type SessionStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
