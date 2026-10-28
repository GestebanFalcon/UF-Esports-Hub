# PBI-6 profile routes — integration requirements

The endpoints are **not mounted on production `app` yet**: #10 and #12 are open, and there is no trusted authentication middleware or persistent profile model in `dev`. Mounting an unauthenticated placeholder would violate this issue's ownership requirement.

## Paths and contracts
Import `profilePaths.self`, `profileUpdateSchema`, `profileResponseSchema` from `@uf-esports-hub/shared`. Paths: GET and PATCH `/api/me/profile`.

**Provisional until #12 is merged:** required `displayName` (1–50 characters), required strings `favoriteGame` (0–60 characters) and `bio` (0–300 characters). No email, role, password, ownership ID, Discord, or unknown keys may appear in updates. Response exposes only `userId`, profile fields, and ISO `updatedAt` timestamp. Align final limits and optionality to #12 before merging.

## Integration
After #10 lands, supply its actual verified-session middleware to `createProfileRouter`. That middleware must reject invalid, missing, or expired credentials and assign only verified user identity to `res.locals.authenticatedUserId`. Never obtain it from user-provided parameters or headers. If using cookies, enforce CSRF protections as established by #10.

After #12 lands, implement `ProfileStore` using its real Drizzle profile table, with `WHERE user_id = verifiedUserId` for both queries. Use the #12 migration and one-profile-per-user constraint. No silent creation on PATCH. Persist timestamps and map DB records to the **public** response contract only.

Then mount in `backend/src/app.ts`:

```ts
app.use(profilePaths.self, createProfileRouter({ authenticate: verifiedSession, store: postgresProfileStore }));
```

This intentionally remains unmounted until the upstream integration is reviewed.

## HTTP outcomes
- 200: validated public profile on GET and PATCH.
- 400: invalid or extra fields on PATCH (with `fieldErrors`).
- 401: no verified authentication / no verified identity on `res.locals`.
- 404: no profile owned by authenticated user; PATCH does not create one.
- 500: store exception or invalid backend response; logs stay server-side.

## Verification
`bun test backend/tests/profile-routes.test.ts` from repository root (after dependencies are installed). Requires real authenticated middleware, Postgres migration and integrated environment before signing off end-to-end persistence, cross-user isolation, token expiry, and acceptance criteria.
