# PBI-6 profile routes — integration requirements

The endpoints are mounted in `src/app.ts` at `profilePaths.self` (`/api/me/profile`) with the PostgreSQL `profileStore` from `store.ts`. Apply all backend migrations before running the application.

## Paths and contracts
Import `profilePaths.self`, `profileUpdateSchema`, `profileResponseSchema` from `@uf-esports-hub/shared`. Paths: GET and PATCH `/api/me/profile`.

The shared profile contract is authoritative: `displayName` is 1–40 characters and cannot be blank, `favoriteGame` is up to 60 characters or null, and `bio` is up to 500 characters or null. PATCH accepts one or more editable fields; omitted fields remain unchanged. Empty favorite game and bio strings are allowed; send null to clear them. No email, role, password, ownership ID, Discord, or unknown keys may appear in updates.

`profileResponseSchema` shares `profileSchema`'s public shape: only `displayName`, `favoriteGame`, and `bio`. Owner IDs, timestamps, and private account fields are excluded from GET and PATCH responses. The frontend consumes this same shared contract.

## Integration
`createProfileRouter` runs `requireAuth` directly. It verifies signed Bearer tokens and assigns the verified UUID to `res.locals.userId`. The router reads that same local; no identity adapter or client-provided ownership ID is needed. Responses use `Cache-Control: no-store`.

`store.ts` implements `ProfileStore` using Drizzle's `playerProfiles` table, with `WHERE user_id = verifiedUserId` for both queries. PATCH updates the timestamp and maps database records through `toProfile` to the public response contract. PATCH never creates missing profiles.

The mount in `backend/src/app.ts` is:

```ts
app.use(profilePaths.self, createProfileRouter({ store: profileStore }));
```

Registration creates the account and initial profile in a single transaction. The initial display name comes from the username, shortened to the shared limit without splitting a Unicode character. Favorite game and bio start as null. Migration `0002_backfill_player_profiles.sql` initializes missing profiles for existing users without replacing saved rows. It follows the profile-table migration `0001_open_leader`.

## HTTP outcomes
- 200: validated public profile on GET and PATCH.
- 400: invalid or extra fields on PATCH (with `fieldErrors`).
- 401: no verified authentication / no verified identity on `res.locals`.
- 404: no profile owned by authenticated user; PATCH does not create one.
- 500: store exception or invalid backend response; logs stay server-side.

## Verification
Run `cd backend && bun run typecheck && bun run build && bun run test`. All profile route tests use signed test tokens with the real auth middleware. `profile-app.test.ts` checks the mounted app and real store using stubbed database operations, including the shared URL, ownership filters, timestamp updates, and public serialization. Tests do not modify the configured database; real persistence checks require applying the migrations and using the running app.
