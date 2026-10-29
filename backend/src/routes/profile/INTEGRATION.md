# PBI-6 profile routes — integration requirements

The endpoints are **not mounted on production `app` yet**. Verified Bearer middleware (`requireAuth`), the `playerProfiles` table, and its migration are present. The remaining integration is a PostgreSQL implementation of `ProfileStore` and mounting the router with that store.

## Paths and contracts
Import `profilePaths.self`, `profileUpdateSchema`, `profileResponseSchema` from `@uf-esports-hub/shared`. Paths: GET and PATCH `/api/me/profile`.

The shared profile contract is authoritative: `displayName` is 1–40 characters and cannot be blank, `favoriteGame` is up to 60 characters or null, and `bio` is up to 500 characters or null. PATCH accepts one or more editable fields; omitted fields remain unchanged. Empty favorite game and bio strings are allowed; send null to clear them. No email, role, password, ownership ID, Discord, or unknown keys may appear in updates.

`profileResponseSchema` shares `profileSchema`'s public shape: only `displayName`, `favoriteGame`, and `bio`. Owner IDs, timestamps, and private account fields are excluded from GET and PATCH responses. The frontend consumes this same shared contract.

## Integration
Supply the existing `requireAuth` middleware to `createProfileRouter`. It verifies signed Bearer tokens and assigns the verified UUID to `res.locals.userId`. The router reads that same local; no identity adapter or client-provided ownership ID is needed. Responses use `Cache-Control: no-store`.

Implement `ProfileStore` using the existing Drizzle `playerProfiles` table, with `WHERE user_id = verifiedUserId` for both queries. Preserve the migration and one-profile-per-user constraint. No silent creation on PATCH. Persist timestamps and map DB records through `toProfile` to the public response contract.

Then mount in `backend/src/app.ts`:

```ts
app.use(profilePaths.self, createProfileRouter({ authenticate: requireAuth, store: postgresProfileStore }));
```

`postgresProfileStore` in the example is the remaining implementation, not an existing export.

## HTTP outcomes
- 200: validated public profile on GET and PATCH.
- 400: invalid or extra fields on PATCH (with `fieldErrors`).
- 401: no verified authentication / no verified identity on `res.locals`.
- 404: no profile owned by authenticated user; PATCH does not create one.
- 500: store exception or invalid backend response; logs stay server-side.

## Verification
Run `cd backend && bun run typecheck && bun run build && bun run test`. Profile route and migration tests use the backend's Node test runner. Tests cover own-profile isolation, the real Bearer middleware, partial updates, nullable fields, field limits, private-field stripping, and HTTP failures with an injected store. Real PostgreSQL persistence and application-level endpoint checks still require the store and mount described above.
