# Match data and API conventions (PBI 11 / #33)

This is the contract and persistence baseline for [#34 scheduling pages](https://github.com/GestebanFalcon/UF-Esports-Hub/issues/34), [#35 scheduling routes](https://github.com/GestebanFalcon/UF-Esports-Hub/issues/35), and [#36 result routes](https://github.com/GestebanFalcon/UF-Esports-Hub/issues/36). Contracts live in `shared/src/match.ts` and are exported through `@uf-esports-hub/shared`. The routes below are proposed integration requirements; this change does not mount match endpoints or add pages.

## Matches and results

Use **one `matches` table**. A fixture exists before its result, and the MVP has at most one current aggregate score pair per fixture. Nullable score columns on the same row allow completion and correction in one atomic update, without duplicate match identity or a second table's lifecycle. The public object groups those columns into `result: { teamScore, opponentScore } | null`. A dedicated strict result-write schema and `/result` subresource let #35 and #36 implement scheduling and scoring independently.

Each match belongs to one existing managed team (`teamId`) and names an opponent as free text, supporting opponents outside UF Esports Hub. Scores are always from that team's perspective; `teamScore` belongs to `teamId`. The game comes from the team resource. No opponent account, second managed-team relationship, mirrored fixture, tournament, roster snapshot, duration, live scoring, or per-map result is implied. Repeated opponents, simultaneous matches, and duplicate scheduling times are allowed. An internal scrimmage still records only one team's perspective.

Tied scores, including 0–0, are valid. Clients can derive win/loss/draw by comparing scores; the model does not impose game-specific scoring or series lengths. Multiple maps, disputed submissions, review workflows, or result history would justify a separate table and new contracts. The current pair represents only the latest saved result.

## Fields and persistence

| Field | Database storage | Rule |
| --- | --- | --- |
| `id` | UUID primary key, database generated | Server assigned |
| `teamId` | Required `team_id` FK to `teams.id` | Set at creation; cannot be changed by PATCH |
| `opponent` | Required varchar(100) | Nonblank; write schemas trim surrounding whitespace |
| `scheduledAt` | Required finite `scheduled_at` timestamptz | Public/write value is an ISO UTC string ending in `Z`; internal value is `Date` |
| `location` | Required varchar(200), default `''` | Free text, such as `Online`; empty string clears it; `null` is invalid |
| `notes` | Required varchar(1000), default `''` | Public scheduling notes; empty string clears them; `null` is invalid |
| `status` | Required varchar(9), default `scheduled` | Only `scheduled`, `completed`, `cancelled` |
| `teamScore`, `opponentScore` | Nullable `team_score`, `opponent_score` integers | Both null unless completed; both required when completed; integers from 0 to 2,147,483,647 |
| `createdAt`, `updatedAt` | Required timestamptz, default now | Internal `Date` metadata; Drizzle updates refresh `updatedAt`; raw SQL writers must refresh it |

PostgreSQL checks reject blank opponents, nonfinite scheduling times, invalid statuses, negative scores, partial results, scores on scheduled/cancelled fixtures, and completed fixtures without both scores. Integer storage enforces the score ceiling. Zod validates the same result/status combinations. Text limits follow the existing team conventions: writes trim JavaScript whitespace; database blank checks use PostgreSQL `btrim` space semantics. Read schemas preserve saved text without normalization.

Deleting a referenced team is **restricted**, preserving its schedule and results. Explicitly delete its matches before deleting the team. Deleting a match preserves the team, owner, accounts, and memberships. Matches inherit ownership from the team's current `managerId`; there is no independently editable match owner or cascading user relationship. A future ownership transfer changes who manages the team's matches. Team name/game edits are reflected through team reads; historical names/games are not snapshotted. Indexes support global and team-scoped calendar reads ordered by `(scheduled_at, id)`.

## Shared contracts and visibility

| Export | Shape / purpose |
| --- | --- |
| `matchCreateSchema` / `MatchCreate` | Required `teamId`, `opponent`, `scheduledAt`, `location`, `notes`; strict body |
| `matchUpdateSchema` / `MatchUpdate` | Partial `opponent`, `scheduledAt`, `location`, `notes`, or `status: scheduled \| cancelled`; at least one defined field |
| `matchResultUpdateSchema` / `MatchResultUpdate` | Required `teamScore` and `opponentScore`; strict replacement body |
| `matchResultSchema` / `MatchResult` | Public score pair; strips unknown fields |
| `matchSchema` / `Match` | Public `id`, `teamId`, `opponent`, `scheduledAt`, `location`, `notes`, `status`, `result` |
| `matchResponseSchema` / `MatchResponse` | Alias of the public match schema |
| `matchListSchema` / `MatchList` | `{ matches: MatchResponse[] }` |
| `matchRecordSchema` / `MatchRecord` | Stored fields, flat nullable scores, and `Date` timestamps |
| `matchStatusSchema` / `MatchStatus` | The three lifecycle states |
| `matchParamsSchema` / `MatchParams` | Strict `{ id: UUID }` route parameters |
| `matchListQuerySchema` / `MatchListQuery` | Required UTC `from`/`to`, optional UUID `teamId`; strict query |
| `matchErrorSchema` / `MatchError` | `{ message: string, fieldErrors?: Record<string, string[]> }` |
| `matchFieldLimits`, `matchListMaxDays`, `matchPaths` | Storage-aligned limits, 93-day calendar window, escaped route builders |

Create requires explicit empty strings when location or notes are unused, even though database inserts have defaults. It always creates a scheduled match without scores; clients cannot supply a status. PATCH omission preserves a field; empty location/notes clear it. `null`, unknown fields, IDs, owner/account data, timestamps, and result fields are rejected by scheduling writes. PATCH also rejects `teamId` and completion. Result replacement accepts only both scores. Clearing a result uses DELETE, not null scores or an empty PUT body.

Serialize database rows with `toMatch(row)`. It explicitly selects public fields, converts `scheduledAt` to ISO UTC, and groups scores into `result`. Responses strip unknown fields, including nested result metadata. They exclude database timestamps, flat score columns, roles, emails, credentials, owner records, and nested teams/rosters. Notes and location are visible to every authenticated reader; do not use them for private team notes.

Forms must convert local scheduling time to UTC before submission and display UTC instants in the viewer's local timezone. Offset strings and timezone-free strings are rejected. Past instants are allowed for historical fixtures and results; no future-only validation or ban on early result entry is imposed.

## Lifecycle and concurrency

| Operation | Allowed current state | Resulting state / behavior |
| --- | --- | --- |
| Create match | None | `scheduled`, both scores null |
| PATCH scheduling fields | `scheduled`, `cancelled` | Preserve state unless `status` is supplied |
| PATCH `status: cancelled` | `scheduled`, `cancelled` | `cancelled`, no scores |
| PATCH `status: scheduled` | `scheduled`, `cancelled` | `scheduled`, no scores |
| PUT result | `scheduled`, `completed` | `completed`; atomically replace both scores, including corrections |
| DELETE result | `scheduled`, `completed` | `scheduled`; atomically clear both scores; repeated clearing succeeds |
| DELETE match | `scheduled`, `cancelled` | Remove match; no result history is retained |

PATCH or DELETE of a completed match returns 409 until its result is explicitly cleared. PUT/DELETE result on a cancelled match returns 409 until scheduling PATCH reactivates it. These operations compare against saved state; body schemas cannot enforce them alone. Calendar reads include all three states.

Scope every mutation to the verified actor's current team ownership **and** allowed saved status in the database statement. For example, a result write updates `status`, `team_score`, and `opponent_score` together only while the team is still owned by the actor and status is `scheduled` or `completed`. Never authorize with an earlier unguarded read followed by an ID-only write. Use a transaction if determining a 404/409 requires additional reads. If cancellation wins a race, a result write must fail its saved-state predicate rather than complete the cancelled match. Corrections use last successful write wins; optimistic versioning and an audit trail are deferred.

## Route conventions for #35 and #36

Mount the future router at `/api/matches`. All reads require a verified session and an existing account. Writes follow the [team role policy](teams.md#route-conventions-for-18): the current global role must be `manager`, and the actor must own the referenced team. Load role and ownership from trusted server data; JWT subject identifies the actor. Global admin/player roles do not grant match writes in this MVP. Role enforcement remains an integration dependency; this migration does not introduce or grant roles.

| Method | Path / shared builder | Success | Work item |
| --- | --- | --- | --- |
| GET | `/api/matches` / `matchPaths.list` | 200 `MatchList` | #35 |
| GET | `/api/matches/:id` / `matchPaths.detail(id)` | 200 `MatchResponse` | #35 |
| POST | `/api/matches` / `matchPaths.list` | 201 `MatchResponse`; `Location: matchPaths.detail(id)` | #35 |
| PATCH | `/api/matches/:id` / `matchPaths.detail(id)` | 200 `MatchResponse` | #35 |
| DELETE | `/api/matches/:id` / `matchPaths.detail(id)` | 204, no body | #35 |
| PUT | `/api/matches/:id/result` / `matchPaths.result(id)` | 200 complete `MatchResponse` | #36 |
| DELETE | `/api/matches/:id/result` / `matchPaths.result(id)` | 200 complete `MatchResponse` with null result | #36 |

GET list requires `?from=<UTC>&to=<UTC>` with `from < to` and a window of at most 93 elapsed days, plus optional `teamId`. Match `scheduled_at >= from AND scheduled_at < to` and sort by `scheduled_at ASC, id ASC`. All matches in the window are returned without silent truncation or pagination. An empty window or nonexistent team filter returns `{ matches: [] }`; detail returns 404 for a nonexistent match. The query contract applies only to GET list. No implicit current-date window, game/status filter, or single-result GET is defined; detail includes the result.

Validate parameters, bodies, and list queries with shared schemas. All errors use `MatchError`: 400 malformed input (optional `fieldErrors`), 401 missing/invalid session or deleted actor, 403 forbidden current role, 404 missing/not-owned resource, 409 disallowed lifecycle transition or concurrent resource change, 500 unexpected storage failure. A manager creating against a missing or unowned team receives the same 404; a mutation of a missing or unowned match also receives the same 404. Resolve ownership before exposing a state conflict. Foreign keys do not authorize callers. Team removal between validation and insertion becomes a generic resource conflict, without leaking database errors, queries, or constraint names.

## Migration and verification

`backend/drizzle/0004_match_schemas.sql` adds an empty match table after the team migration, with a generated snapshot and journal entry. It does not rewrite users, profiles, teams, memberships, or existing migrations. Apply it using the backend's usual `bun run db:migrate` workflow before implementing routes.

Shared tests cover field boundaries, protected fields, UTC times, calendar windows, score replacement, lifecycle combinations, preservation of saved text, and exact public serialization. Backend tests apply the full migration chain twice on disposable in-memory PostgreSQL (PGlite), upgrade an existing team database, and exercise defaults, foreign keys, score/state constraints, range filtering, Drizzle timestamps, and restricted deletion. They do not connect to the configured development database. Run tests, typechecks, and builds in shared and both apps after refreshing local shared package copies. HTTP authorization, race handling, and UI checks belong to #34–#36; these contracts do not claim that those routes are implemented.
