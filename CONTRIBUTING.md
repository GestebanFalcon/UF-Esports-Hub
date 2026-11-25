# Code conventions

Use this guide for conventions shared across the repository. Package READMEs cover setup; feature documents cover business rules and integration details. Before adding a pattern, compare the nearby implementation. When a convention deliberately changes, update this guide in the same change.

## Keep code readable

- Use names that explain the data or action, such as `playerId` and `rocketLeagueTeamId`.
- Keep types, functions, and helpers close to their use. Add abstractions when they make existing code easier to understand.
- Expand long imports, object literals, queries, and assertions when that makes them easier to scan. Give separate behaviors separate test cases.
- Explain decisions in comments; avoid comments that only repeat the code.
- Match the surrounding indentation, quotes, and semicolons. Avoid unrelated formatting changes.

## Shared contracts

Contracts live in `shared/src`, organized by domain: [user.ts](shared/src/user.ts), [profile.ts](shared/src/profile.ts), and [team.ts](shared/src/team.ts). Keep related schemas, types, serializers, limits, and route paths together. Use a domain filename rather than a route filename for a module that also models stored and public data.

Zod schemas are the source of truth for shared types. Put each inferred type beside its schema:

```ts
export const teamResponseSchema = teamSchema;
export type TeamResponse = z.infer<typeof teamResponseSchema>;
```

| Purpose | Naming / convention |
| --- | --- |
| Public data | `teamSchema` / `Team` |
| Internal database row | `teamRecordSchema` / `TeamRecord` |
| Resource writes | `teamCreateSchema` / `TeamCreate`, `teamUpdateSchema` / `TeamUpdate` |
| API response | `teamResponseSchema` / `TeamResponse`; alias the public schema when the shapes match |
| Public serialization | `toTeam(record)` explicitly selects public fields |
| Field limits | `teamFieldLimits`, consistent with database storage |
| Route paths | `teamPaths`, including builders for parameterized paths |
| Database inserts | Infer backend `NewTeam` from Drizzle's `$inferInsert`, which accounts for defaults |

Existing authentication contracts use their established request/form names. Preserve exported names and documented response envelopes when extending a feature.

### Reads and writes have different responsibilities

- Read and record schemas validate saved values without trimming, changing case, or otherwise normalizing them. Keep normalization in write schemas where the feature explicitly calls for it. Never trim or alter passwords.
- Resource create/update schemas use `z.object({ ... }).strict()` to reject unknown and protected fields. Ownership, roles, IDs, and account details must not become editable through a resource body. Authentication has documented exceptions: registration intentionally strips confirmation and unknown fields.
- PATCH accepts partial updates and requires at least one defined editable field. Document the difference between omitted fields, empty strings, and `null`.
- Public response schemas strip unknown fields. Serializers explicitly select public fields, as [toUser](shared/src/user.ts), [toProfile](shared/src/profile.ts), and [toTeam](shared/src/team.ts) do. Do not return a database row directly.
- Internal timestamps are `Date` objects. When a timestamp belongs in a public response, serialize it to an ISO UTC string. Some responses deliberately omit timestamps.
- Keep public schemas small: include only the fields that response needs. Nested account records must not leak through team or roster responses.

Export shared contracts through [shared/src/index.ts](shared/src/index.ts). Both apps import them from `@uf-esports-hub/shared`, rather than reaching into shared source files or duplicating schemas. Relative imports in shared and backend use `.js` extensions for their NodeNext builds.

Build shared before installing app dependencies on a fresh checkout. After adding or renaming shared files or exports, rebuild shared and run `bun install` in both apps to refresh their local package copies. See the [shared README](shared/README.md).

## Backend and database

- Keep application middleware and router mounting in [backend/src/app.ts](backend/src/app.ts). Put feature handlers under `backend/src/routes/<feature>/`; keep persistence queries in the feature's store when following the profile router pattern.
- Validate requests with shared schemas. Use the shared error shape for that feature (`message` and optional `fieldErrors`); do not expose database errors or queries in responses.
- Derive the acting user from verified authentication. Apply ownership in the database query. Global roles and resource ownership are separate checks; a foreign key does not authorize a request.
- Keep database definitions in [backend/src/db/schema.ts](backend/src/db/schema.ts). Use constraints for foreign keys and uniqueness, alongside application validation. TypeScript fields use camelCase; SQL tables and columns use snake_case.
- After a schema change, run `bun run db:generate` in `backend`, review the SQL, and include its snapshot and journal update. Add a migration rather than rewriting an existing migration. Verify relationship and deletion behavior on a disposable database.
- Drizzle updates refresh fields configured with `$onUpdate`; raw SQL writers must update those timestamps explicitly.

Feature-specific limits, visibility, status codes, and deletion rules belong with the feature's documentation, such as [team conventions](shared/docs/teams.md) and [profile integration](backend/src/routes/profile/INTEGRATION.md).

## Frontend

Keep `App.tsx` focused on application composition and route selection. Pages assemble feature components; requests, session handling, and feature logic belong under `frontend/src/features/<feature>/`. Put reusable UI in `components` and styles in the corresponding stylesheet. Validate API responses with shared schemas. See the [frontend structure](frontend/README.md#project-structure).

## Verification

Run checks appropriate to the changed behavior. For shared contract changes, check shared and both consuming apps. Run the following from each package directory:

| Package | Checks |
| --- | --- |
| `shared` | `bun run test`, `bun run typecheck`, `bun run build` |
| `backend` | `bun run test`, `bun run typecheck`, `bun run build` |
| `frontend` | `bun run test`, `bun run typecheck`, `bun run build` |

Shared tests use `bun:test`; backend tests use `node:test` through the package script; frontend tests use `bun:test`. Test observable behavior: validation boundaries, protected fields, exact public responses, preservation of read values, persistence constraints, and authorization where relevant. Database tests must use disposable databases rather than the configured development database.

For documentation-only edits, check local links and `git diff --check`; application tests are unnecessary. In change descriptions, state the resulting behavior and the checks actually performed. Keep proposed endpoints distinct from routes mounted in the app.
