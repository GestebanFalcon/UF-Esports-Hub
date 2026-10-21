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

Login and registration are frontend previews. Valid submissions explain that authentication is coming soon; no passwords are stored or sent, no account is created, and no session is started. The shared `registerSchema` and `loginSchema` validate form inputs. API request and response schemas are exported separately for future backend endpoints.

The Bun server falls back to the app HTML for direct page navigation. When hosting `dist/` on a static host, configure an equivalent fallback to `index.html` so `/register` works on refresh.
