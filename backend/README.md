# UF Esports Hub backend

Express + TypeScript API with Drizzle ORM and PostgreSQL. Dependencies are managed with Bun; Node.js 22+ runs the built server.

## Setup

```sh
cd ../shared
bun install
bun run build
cd ../backend
bun install
cp .env.example .env
bun run dev
```

Set `DATABASE_URL` in `.env` to your PostgreSQL connection string and create the database before applying migrations. Set `JWT_SECRET` to a random secret generated with `openssl rand -hex 32`; the server refuses to start without a secret of at least 32 bytes. `JWT_EXPIRES_IN_SECONDS` defaults to 900 (15 minutes) and accepts integers from 1 to 86400. `PORT` defaults to 3001. `GET /health` returns `{ "status": "ok" }` and only checks the API process, not the database connection.

## Migrations

The initial migration is checked into `drizzle/` and is ready to apply:

```sh
bun run db:migrate
```

After changing `src/db/schema.ts`, run `bun run db:generate`, review the generated SQL, then run `bun run db:migrate`. Generation does not require a running database. Migration commands follow the [Drizzle migration workflow](https://orm.drizzle.team/docs/drizzle-kit-migrate).

`users` contains UUID `id`, required `username`, `email`, and `hashedPassword`, plus `role` and timestamps. Username and email have case-insensitive unique indexes. Hash passwords in the authentication layer before inserting; the schema does not perform hashing. `updatedAt` is automatically refreshed by Drizzle updates; raw SQL writers must update it explicitly.

`player_profiles` stores at most one profile per user. Its `user_id` is both the primary key and a cascading foreign key to `users.id`, so profile ownership cannot be reassigned. `display_name` is required (1–40 characters); `favorite_game` (0–60) and `bio` (0–500) are nullable. All three are public profile fields. Email, role, password hashes, and account timestamps remain in `users` and are excluded from public profile serialization. Profile update contracts accept only display name, favorite game, and bio; unknown and account fields are rejected. Credentials stay in the separate authentication contract.

## Checks and production

```sh
bun run typecheck
bun run test
bun run build
bun run start
```

Import `db` from `src/db/index.ts` for database queries. Authentication routes live in `src/routes/auth/`: `index.ts` defines the router mounted at `/api/auth`, and `register.ts` handles `POST /api/auth/register`. Keep application middleware and router mounting in `src/app.ts`.

Shared validation and types come from `@uf-esports-hub/shared`: use `UserRecord` for database rows and `toUser(row)` to produce the JSON-safe `User` without `hashedPassword`. Dev/build/typecheck scripts rebuild shared first. See [shared contracts](../shared/README.md).

## Authentication

- `POST /api/auth/register`: `{ "username": "Gator", "email": "player@ufl.edu", "password": "password123" }`. Returns `201` with `{ "user": ... }`. Passwords are bcrypt-hashed at cost 12 and limited to 72 UTF-8 bytes.
- `POST /api/auth/login`: `{ "email": "player@ufl.edu", "password": "password123" }`. Email matching ignores case; passwords are preserved exactly. Uses the shared `loginRequestSchema` and returns `200` matching `loginResponseSchema`: `{ "user": ..., "accessToken": "...", "tokenType": "Bearer", "expiresIn": 900 }`. Incorrect credentials return the same `401` message for unknown users and incorrect passwords. Invalid input returns `400` with `message` and `fieldErrors`. Unsupported body charsets or encodings return JSON `415` errors.
- `GET /api/auth/me`: send `Authorization: Bearer <accessToken>`. Returns `{ "user": ... }`; missing, expired, invalid tokens and deleted users return `401` with a `WWW-Authenticate` header.

JWTs use HS256, a user UUID in `sub`, unique token IDs, issued-at and expiry timestamps, and fixed issuer/audience checks. Tokens contain no passwords or profile information. Authentication responses use `Cache-Control: no-store`. There are no refresh tokens or server-side logout/revocation: log in again after expiration; rotating the signing secret invalidates existing tokens.

Protect future routes by mounting `requireAuth` from `src/middleware/require-auth.ts` before their handler. Read the verified UUID from `res.locals.userId` (typed with `AuthLocals`); apply account existence and resource permissions as needed, as `/me` does.

Registration allows 50 requests per IP per hour, counting successes and failures. Login allows 10 failed requests per IP/email pair per 15 minutes; email casing does not create a new quota, and successful logins do not consume the failure quota. A separate ceiling of 300 total login requests per IP per 15 minutes limits requests across different emails and includes successes. The quotas are independent, so registration traffic does not consume login allowances and one email's failures do not exhaust another email's failure quota. Limits return JSON `429` and `Retry-After`. IPv6 addresses are grouped into /56 subnets, following the library's default policy. The default rate-limit stores are in memory per server process. For multiple instances, configure shared stores; behind a reverse proxy, configure Express `trust proxy` for the actual trusted proxy topology before relying on client IP limits. Use HTTPS in deployment.

The frontend files are unchanged. The server and shared contracts use **email/password**. The shared login response preserves and validates `accessToken`, `tokenType`, and `expiresIn`; token handling can be wired up when implementing the frontend flow.

`bun run test` runs HTTP tests against the real Express app, bcrypt, and JWT implementation, with stubbed database queries and test-only configuration. It covers registration-to-login, public serialization, credential failures, validation, expired/forged tokens, protected routes, rate limiting, and configuration. It does not require or connect to PostgreSQL. No database migration is needed for this change.
