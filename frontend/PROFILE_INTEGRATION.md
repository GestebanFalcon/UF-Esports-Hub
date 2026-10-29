# PBI-5 — account-linked player profile UI

This branch replaces the localStorage preview with a server-backed client. The frontend uses the existing verified Bearer session. The profile API is **not mounted in the current backend**; persistence and end-to-end profile verification still depend on the profile endpoints being integrated.

## Frontend structure
- `src/main.tsx` renders `App` only.
- `src/app/App.tsx` selects `/profile` and `/profile/edit`, tracks browser Back/Forward, and supplies the shared header, footer, and authentication state.
- `src/pages/PlayerProfilePage.tsx` owns the page layout and waits for session restoration before showing the profile feature. Logging out removes the profile from view.
- `src/features/profile/` owns the profile editor, API client, validation, and styles.
- The shared header links to the profile; the duplicate profile shell and floating shortcut are removed.

## API integration
- GET and PATCH `/api/me/profile`; provisional contract on `nicandro/pbi-6-profile-routes` (#27). Reconcile the temporary definition in `src/features/profile/api.ts` with the mounted endpoint contract when that endpoint is integrated. The current shared profile schema differs: display names allow 40 characters, bios allow 500, optional fields are nullable, and the public profile omits identity and timestamps.
- Update payload: displayName (required 1–50), favoriteGame (0–60), bio (0–300). Discord has been removed because it is not in the current shared contract.
- Response: userId, displayName, favoriteGame, bio, updatedAt. No account email, role or hash.
- API origin: `VITE_API_URL` if set; otherwise `http://localhost:3001`.
- Requests use the current Bearer token from the auth client. Signed-out or expired sessions cannot send profile requests. A 401 clears the rejected session without clearing a newer session established while the request was in flight.

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
Run `cd frontend && bun run typecheck && bun run build && bun run test`. Profile validation and Bearer-session request tests are included in the normal frontend test suite under `tests/profile.test.ts`.

Once the profile endpoints are integrated, test the UI with an actual signed-in user and test:
1. GET existing profile, refresh, log out/in, and verify saved details.
2. PATCH valid data; GET confirms persistence.
3. PATCH rejected fields; see errors without losing draft.
4. GET/patch 401 and token expiry; 404 profile; 500/network outage.
5. Discard, Back/Forward, keyboard tab order, narrow mobile layout.

## Concurrent PRs
The frontend integration updates `App.tsx` and the shared header. Backend, role schema, and shared exports are unchanged.
