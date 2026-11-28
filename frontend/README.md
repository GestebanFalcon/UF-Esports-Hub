# UF Esports Hub frontend

React frontend served and bundled with Bun. Dark blue and black theme with responsive layouts.

Follow the repository's [code conventions](../CONTRIBUTING.md), including [frontend guidance](../CONTRIBUTING.md#frontend).

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

## API configuration

All frontend API clients use `src/config/api.ts`. Set `BUN_PUBLIC_API_ORIGIN` to the backend origin; it defaults to `http://localhost:3001`. Use an origin without an `/api` suffix. Surrounding whitespace and trailing slashes are removed.

For example, copy `.env.example` to `.env` in `frontend` and set:

```dotenv
BUN_PUBLIC_API_ORIGIN=https://api.example.com
```

Authentication derives `AUTH_API_URL` from that origin. Other features use `apiUrl()` with their shared paths, such as `apiUrl(profilePaths.self)` or, when team requests are integrated, `apiUrl(teamPaths.list)`.

Bun [embeds public configuration during bundling](https://bun.com/docs/bundler/html-static#inline-environment-variables). `scripts/api-origin-plugin.ts` supplies the resolved origin, including the default when the variable is unset, to both the Bun server and production build. Restart `bun run dev` or `bun run start` after changing the value; rebuild `dist/` when using static hosting. Replace any previous `VITE_API_URL` setting with `BUN_PUBLIC_API_ORIGIN`.

## Project structure

```text
src/
  app/App.tsx             Route selection and app composition
  components/layout/      Shared header, footer, and brand
  components/ui/          Reusable UI elements
  config/api.ts           Shared backend API origin and URL builder
  features/auth/
    components/           Authentication form, fields, and intro
    api.ts                Registration requests and API error handling
    client.ts             Login requests, tokens, and session storage
    types.ts              Frontend authentication types
    use-auth.ts           Session lifecycle for React
    use-auth-form.ts      Form validation and submission state
  features/profile/       Profile editor, API client, validation, and styles
  features/teams/
    components/           Team list, details, and creation form
    use-team-create.ts    Shared validation and creation submission state
  pages/                  Home, authentication, profile, team, and not-found pages
  styles/                 Base, layout, and page styles with their media rules
  index.html              HTML entry point
  main.tsx                Browser entry point
  server.ts               Bun development/production server
scripts/
  build.ts                Production bundling
  api-origin-plugin.ts    API origin injection for server and static bundles
tests/
  setup.ts                DOM registration and React cleanup, preloaded by bunfig.toml
  app.test.tsx            Route, navigation, session, and logout regression tests
  teams/                  Team presentation, validation, and interaction tests
  *.test.ts               API configuration, authentication, registration, and profile tests
```

Keep `App.tsx` focused on composing pages and the site layout. Pages assemble feature components; authentication request and session logic belongs in `features/auth`, and shared controls belong in `components`. Put style changes and responsive rules in the corresponding stylesheet. Shared API contracts and validation remain in `../shared`.

Match the existing PascalCase component filenames and named exports. Hook modules use kebab-case filenames. Keep tests under `tests/` so the normal test command discovers them; use `tests/teams/` for team tests. Team styles live in `src/styles/teams.css` and are imported by the team pages.

The [PBI 3.5 cleanup note](docs/pbi-3.5-frontend-refactor.md) records this refactor's scope and acceptance criteria.

## Pages

- `/`: minimal landing page with a link to registration.
- `/register`: username, email, password, and confirmation form with shared Zod validation and password visibility controls.
- `/login`: email and password form with shared Zod validation and password visibility controls.
- `/profile` and `/profile/edit`: account-linked profile viewing and editing through the verified session; see [profile integration](PROFILE_INTEGRATION.md).
- `/teams`: team list page and link to team creation.
- `/teams/create`: team creation page.
- `/teams/:id`: team detail page.
- Other paths display a not-found page.

Team navigation and pages are integrated into `src/app/App.tsx`, including trailing-slash handling and browser Back/Forward. The team list and detail components retain supplied-data, loading, error, retry, empty, and missing-team states. The mounted pages currently show an unavailable message because [the team HTTP routes](../shared/docs/teams.md#route-conventions-for-18) are separate integration work; they do not fabricate empty lists or missing teams. Creation stays disabled until trusted manager access and a creation handler are supplied. No team requests or browser-local team persistence are used yet.

The creation form uses `TeamCreate`, `teamCreateSchema`, and `teamFieldLimits` from the shared package, including the 100/80/500-character limits and trimmed write values. Its hook prevents duplicate submissions, preserves drafts on failure, displays field and status errors, and requires a valid UUID from the creation handler before navigating. The callback receives the shared create payload and returns a team ID; future HTTP integration must validate the full response with `teamResponseSchema` and obtain permissions from trusted server data.

Registration calls `POST /api/auth/register`; login calls `/api/auth/login` on the configured backend origin. Both forms use shared Zod validation and display server messages and field errors. Successful registration directs the user to log in; successful login displays the signed-in account with a link home and a logout button in navigation.

The authentication client validates login responses and keeps the Bearer token and its expiry in `sessionStorage` so sessions survive navigation and reloads within a tab. Passwords and user records are never persisted. If browser storage is unavailable, login works in memory until navigation or reload. On startup, `/api/auth/me` verifies saved credentials and loads the user before displaying a signed-in account. Expired or rejected tokens are cleared. Temporary verification failures display a message and preserve saved credentials for a reload retry.

`src/features/auth/client.ts` exposes `authClient.authenticatedFetch("/me")` for requests relative to the authentication API, attaching the Bearer token and clearing the session on `401`. Session expiry and logout clear browser credentials; another login is required because the backend has no refresh endpoint. Logout does not revoke already-issued tokens on the server.

Start the backend on port 3001 and use `http://localhost:5173` for frontend development to match backend CORS. Deployment configuration and postponed password validation work are tracked in [deferred considerations](../shared/docs/deferred-considerations.md).

Run `bun run typecheck` to check frontend source, build tooling, and tests. Run `bun run test` for authentication, registration, profile, application route, and team tests. This includes saved sessions, expiration, rejected tokens, logout, unavailable storage, API failures, shared team validation, creation permissions, duplicate submissions, and unavailable team routes. `bunfig.toml` preloads the Happy DOM setup before React interaction tests and cleans up rendered components after each test. Run `bun run build` for the production bundle; `bun run build --outdir <directory>` overrides its output directory.

The Bun server falls back to the app HTML for direct page navigation. When hosting `dist/` on a static host, configure an equivalent fallback to `index.html` so `/register` works on refresh.
