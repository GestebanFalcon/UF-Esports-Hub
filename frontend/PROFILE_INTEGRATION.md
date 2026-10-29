# PBI-5 — account-linked player profile UI

This branch replaces the localStorage preview with a server-backed client. The API is **not live on dev**: #10 (verified login/session), #12 (profile schema/migration), and #13 (mounted, persistent GET/PATCH endpoints) are pending.

## API integration
- GET and PATCH `/api/me/profile`; provisional contract on `nicandro/pbi-6-profile-routes` (#27). Once #12/#13 merge, replace the temporary frontend contract definition in `playerProfileApi.ts` with imports from `@uf-esports-hub/shared`.
- Update payload: displayName (required 1–50), favoriteGame (0–60), bio (0–300). Discord has been removed because it is not in the current shared contract.
- Response: userId, displayName, favoriteGame, bio, updatedAt. No account email, role or hash.
- API origin: `VITE_API_URL` if set; otherwise `http://localhost:3001`.
- `credentials: "include"` currently assumes cookie sessions. Confirm the actual token transport in #10 before enabling: if Bearer JWT is chosen, use the auth module's verified token provider (never a hardcoded token or raw user id). For cookie sessions configure credentialed CORS and CSRF defenses in the backend.

## States
- Loading message while initial GET is in flight.
- 401: sign-in prompt; no local profile fallback.
- 404: unavailable profile with retry; does not invent/create a server profile.
- Network / 5xx: error and retry.
- Validation: field errors, no PATCH until client checks pass; backend 400 fieldErrors displayed.
- Save failure: input is retained; success requires a valid server response.
- Save button disabled while saving; cancel/discard restores last server-confirmed state.
- Browser back/forward reflects view/edit navigation.

## Verification
Code and pure validation tests added; **no test/build, real JWT/cookie, PostgreSQL, end-to-end refresh/new-login, or keyboard/mobile device test was executed in this session.**
After #10/#12/#13 integrate, run `cd frontend && bun test src/playerProfileApi.test.ts && bun run build`, test the UI with an actual signed-in user and test:
1. GET existing profile, refresh, log out/in, and verify saved details.
2. PATCH valid data; GET confirms persistence.
3. PATCH rejected fields; see errors without losing draft.
4. GET/patch 401 and token expiry; 404 profile; 500/network outage.
5. Discard, Back/Forward, keyboard tab order, narrow mobile layout.

## Concurrent PRs
UI modifications are scoped to PBI-5 files; no changes to `App.tsx`, backend, role schema, or shared exports.
