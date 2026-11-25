# Shared API contracts

Local package used by the frontend and backend. Zod is the source of truth for the TypeScript types.

Follow the repository's [shared contract conventions](../CONTRIBUTING.md#shared-contracts) when adding or changing schemas.

Install dependencies with `bun install` in this folder, then run `bun run build`. Run `bun install` in the frontend and backend to link the package. Their dev/build scripts rebuild shared automatically. While editing shared during an active dev session, run `bun run dev` here in another terminal to watch for changes.

Build shared before installing the app dependencies on a fresh checkout. After adding new shared files or exports, rebuild shared and rerun `bun install` in both apps so Bun refreshes the local package files.

```ts
import { userSchema, toUser, type User } from '@uf-esports-hub/shared';

// Backend: convert a Drizzle user row to validated JSON-safe data.
const response = toUser(databaseRow);

// Frontend: validate JSON received from the API.
const user: User = userSchema.parse(await responseFromApi.json());
```

`User` / `userSchema` contain `id`, `username`, `email`, `createdAt`, and `updatedAt`. Timestamps are ISO UTC strings. Parsing strips unknown fields, including `hashedPassword`.

`UserRecord` / `userRecordSchema` match the database row: timestamps are `Date` objects and `hashedPassword` is required. Use these internally; call `toUser` before sending a row to the frontend. Hashing stays in the backend authentication layer. These schemas validate data without changing username or email casing.

`NewUser` remains inferred from Drizzle in the backend because database defaults make insert fields optional. No database migration is required by this package.

Run `bun run test` for validation and serialization tests. Schema APIs follow the [Zod documentation](https://zod.dev/api).

## Team contracts

`Team` / `teamSchema` contain public team fields: `id`, `name`, `game`, `description`, and `managerId`. `TeamRecord` adds internal `Date` timestamps; `toTeam` selects only the public fields. Read schemas preserve stored text. `teamCreateSchema` and `teamUpdateSchema` trim input, reject unknown and protected fields, and accept only name, game, and description. Updates require at least one defined field.

Contracts live in `src/team.ts`, following the user and profile modules. `teamResponseSchema` uses the same public shape as `teamSchema`. Roster responses contain only player IDs and display names. See [team data and route conventions](docs/teams.md) for relationships, field limits, ownership/membership rules, `/api/teams` paths, migration, and seed examples. HTTP routes are implemented separately in #18.

## Player profile contracts

`ProfileRecord` matches `player_profiles`: `userId` (UUID), required `displayName` (1–40 characters), nullable `favoriteGame` (up to 60) and `bio` (up to 500), and database `Date` timestamps. The three profile fields are public. `Profile` / `profileSchema` contain only those public fields, with nullable values represented as JSON `null`; `toProfile` excludes owner IDs and timestamps. `ProfileUpdate` / `profileUpdateSchema` accept only editable profile fields, reject unknown and protected account fields, and require at least one field. Empty favorite game and bio strings are allowed; send `null` to clear either value.

`profilePaths.self` defines `/api/me/profile`. Its GET and PATCH responses use `ProfileResponse` / `profileResponseSchema`, which share the same public shape as `Profile`. `profileErrorSchema` describes error messages with optional field errors. `profileFieldLimits` provides the database-aligned limits to clients.

## Authentication contracts

All exports below are available from `@uf-esports-hub/shared`; their types are inferred from Zod.

| Schema | Type | Purpose |
| --- | --- | --- |
| `registerSchema` | `RegisterInput` | Registration form with password confirmation |
| `registerRequestSchema` | `RegisterRequest` | Username, email, password; strips confirmation and unknown fields |
| `loginSchema` | `LoginInput` | Email and nonempty password for the login form |
| `loginRequestSchema` | `LoginRequest` | Login API body, same shape as the form |
| `registerResponseSchema` | `RegisterResponse` | Registration success body containing a public `user` |
| `loginResponseSchema` | `LoginResponse` | Public `user`, nonempty `accessToken`, `tokenType: "Bearer"`, and positive integer `expiresIn` in seconds |
| `authErrorSchema` | `AuthError` | Error `message` and optional `fieldErrors` |

Registration requires at least eight password characters. Login uses email/password and only requires a nonempty password so it can accept existing credentials without applying a new-account policy. Neither schema trims or changes passwords. Backend login matches emails without regard to case and returns an expiring JWT. Parsing a login response retains the token fields and removes unknown fields, including password hashes inside `user`. The frontend calls the registration and login APIs, handles Bearer tokens, and verifies saved sessions through `/api/auth/me`.

Postponed work, including the frontend/backend password byte-limit mismatch, is tracked in [deferred considerations](docs/deferred-considerations.md).
