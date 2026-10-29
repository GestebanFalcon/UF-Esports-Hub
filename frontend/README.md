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

## Project structure

```text
src/
  app/App.tsx             Route selection and app composition
  components/layout/      Shared header, footer, and brand
  components/ui/          Reusable UI elements
  config/api.ts           Backend authentication API origin
  features/auth/
    components/           Authentication form, fields, and intro
    api.ts                Registration requests and API error handling
    client.ts             Login requests, tokens, and session storage
    types.ts              Frontend authentication types
    use-auth.ts           Session lifecycle for React
    use-auth-form.ts      Form validation and submission state
  pages/                  Home, authentication, and not-found pages
  styles/                 Base, layout, and page styles with their media rules
  index.html              HTML entry point
  main.tsx                Browser entry point
  server.ts               Bun development/production server
scripts/build.ts          Production bundling
tests/                    Authentication and registration API tests
```

Keep `App.tsx` focused on composing pages and the site layout. Pages assemble feature components; authentication request and session logic belongs in `features/auth`, and shared controls belong in `components`. Put style changes and responsive rules in the corresponding stylesheet. Shared API contracts and validation remain in `../shared`.

The [PBI 3.5 cleanup note](docs/pbi-3.5-frontend-refactor.md) records this refactor's scope and acceptance criteria.

## Pages

- `/`: minimal landing page with a link to registration.
- `/register`: username, email, password, and confirmation form with shared Zod validation and password visibility controls.
- `/login`: email and password form with shared Zod validation and password visibility controls.
- Other paths display a not-found page.

Registration calls `POST http://localhost:3001/api/auth/register`; login calls `/api/auth/login` on the same backend. Both forms use shared Zod validation and display server messages and field errors. Successful registration directs the user to log in; successful login displays the signed-in account with a link home and a logout button in navigation.

The authentication client validates login responses and keeps the Bearer token and its expiry in `sessionStorage` so sessions survive navigation and reloads within a tab. Passwords and user records are never persisted. If browser storage is unavailable, login works in memory until navigation or reload. On startup, `/api/auth/me` verifies saved credentials and loads the user before displaying a signed-in account. Expired or rejected tokens are cleared. Temporary verification failures display a message and preserve saved credentials for a reload retry.

`src/features/auth/client.ts` exposes `authClient.authenticatedFetch("/me")` for requests relative to the authentication API, attaching the Bearer token and clearing the session on `401`. Session expiry and logout clear browser credentials; another login is required because the backend has no refresh endpoint. Logout does not revoke already-issued tokens on the server.

Start the backend on port 3001 and use `http://localhost:5173` for frontend development to match backend CORS. Deployment configuration and postponed password validation work are tracked in [deferred considerations](../shared/docs/deferred-considerations.md).

Run `bun run typecheck` to check frontend source, build tooling, and tests. Run `bun run test` for authentication and registration API tests covering login, validation errors, saved sessions, expiration, rejected tokens, logout, unavailable storage, and registration failures. Run `bun run build` for the production bundle; `bun run build --outdir <directory>` overrides its output directory.

The Bun server falls back to the app HTML for direct page navigation. When hosting `dist/` on a static host, configure an equivalent fallback to `index.html` so `/register` works on refresh.
