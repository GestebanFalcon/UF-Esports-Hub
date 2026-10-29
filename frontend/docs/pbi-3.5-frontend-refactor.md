# PBI 3.5: Frontend structure and maintainability

Branch: `pbi-3.5-frontend-refactor`

As a frontend contributor, I want pages, reusable components, authentication behavior, and styles to have clear homes so I can add features without expanding a single application component.

## Scope

- Reduce `App.tsx` to route selection, session wiring, and site composition.
- Extract home, authentication, and not-found pages, plus shared layout components.
- Group authentication UI, form state, API handling, session state, and types under `features/auth`.
- Share authentication field rendering and consolidate registration/login error handling.
- Separate browser startup from the Bun server and production build script.
- Group styles and responsive rules by responsibility while preserving existing selectors and appearance.
- Replace the template build argument parser with a typed build script supporting the default production build and an output-directory override.
- Declare TypeScript explicitly and provide a working project-wide typecheck.
- Document the folder conventions and keep existing authentication behavior intact.

## Acceptance criteria

- `/`, `/login`, `/register`, and unknown routes retain their existing content and navigation; trailing slashes still work.
- Login, registration, shared validation, field errors, password visibility, and submission feedback remain available.
- Token storage, `/me` restoration, expiry handling, and logout continue to work.
- `bun run typecheck`, `bun run test`, and `bun run build` pass from `frontend`.
- Backend authentication contracts, database schemas, and password policies are unchanged.

Password byte-limit validation, deployment API/CORS configuration, and other postponed authentication work remain in [deferred considerations](../../shared/docs/deferred-considerations.md).
