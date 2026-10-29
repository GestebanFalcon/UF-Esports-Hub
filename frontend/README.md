# UF Esports Hub frontend

React frontend served and bundled with Bun. Dark blue and black theme with responsive layouts.

## Setup

```sh
cd ../shared
bun install
bun run build
cd ../frontend
bun install
bun run dev
```

Open http://localhost:5173 (override with `PORT` if needed). `bun run build` creates the production bundle; `bun run start` runs the Bun server in production mode. Dev, start, and build scripts rebuild shared first.

## Pages

- `/`: minimal landing page with a link to registration.
- `/register`: username, email, password, and confirmation form with shared Zod validation and password visibility controls.
- `/login`: email and password form with shared Zod validation and password visibility controls.
- Other paths display a not-found page.

Registration calls `POST http://localhost:3001/api/auth/register`; login calls `/api/auth/login` on the same backend. Both forms use shared Zod validation and display server messages and field errors. Successful registration directs the user to log in; successful login displays the signed-in account with a link home and a logout button in navigation.

The authentication client validates login responses and keeps the Bearer token and its expiry in `sessionStorage` so sessions survive navigation and reloads within a tab. Passwords and user records are never persisted. If browser storage is unavailable, login works in memory until navigation or reload. On startup, `/api/auth/me` verifies saved credentials and loads the user before displaying a signed-in account. Expired or rejected tokens are cleared. Temporary verification failures display a message and preserve saved credentials for a reload retry.

`src/auth.ts` exposes `authClient.authenticatedFetch("/me")` for requests relative to the authentication API, attaching the Bearer token and clearing the session on `401`. Session expiry and logout clear browser credentials; another login is required because the backend has no refresh endpoint. Logout does not revoke already-issued tokens on the server.

Start the backend on port 3001 and use `http://localhost:5173` for frontend development to match backend CORS. Deployment configuration and postponed password validation work are tracked in [deferred considerations](../shared/docs/deferred-considerations.md).

Run `bun run test` for authentication client tests covering login, validation errors, saved sessions, expiration, rejected tokens, logout, and unavailable storage. Run `bun run build` for the production bundle.

The Bun server falls back to the app HTML for direct page navigation. When hosting `dist/` on a static host, configure an equivalent fallback to `index.html` so `/register` works on refresh.
