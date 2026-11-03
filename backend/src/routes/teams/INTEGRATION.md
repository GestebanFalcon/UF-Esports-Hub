# PBI-10 Team route integration

**Not mounted:** authentication (#10), team contracts and database constraints (#15), and role permissions (#9) must be integrated first. This branch provides a route factory, validation and explicit store interface, not production-persistent team CRUD.

Routes (all authenticated): GET /api/teams -> {teams: TeamResponse[]}; GET /api/teams/:id -> TeamResponse; POST /api/teams -> 201 TeamResponse; PATCH /api/teams/:id -> TeamResponse.

Visibility: any authenticated role can list and view all teams. Only verified **manager** accounts can create/update. No admin override is supported in this MVP: admins are denied writes unless the policy is explicitly revised and tested. No roster operations are supported.

Provisional fields: name 1–100, game 1–80, description 0–500. Team response also contains UUID id and managerId. Create/update bodies are strict and reject managerId, membership, role and unknown fields. Update requires at least one field.

Identity MUST come from JWT/session validation and a server-verified role; never from headers/params/body. Middleware must populate res.locals.verifiedTeamIdentity. Persistence adapter must implement atomic UPDATE ... WHERE id = supplied team AND manager_id = verified actor. Prefer indistinguishable 404 for absent or non-owned team. Add team ownership foreign key to users, unique constraints chosen by #15 and database conflict mapping to TeamConflictError. No roster mutation is in scope.

HTTP errors: 400 invalid UUID/payload, 401 absent/invalid session, 403 forbidden role, 404 missing/not-owned, 409 DB conflict, 500 unexpected storage failure. Errors do not expose database details.

Before completing #18: merge #10/#15/#9, settle final schemas and auth transport, mount at /api/teams, implement Postgres TeamStore, run route tests with verified auth, verify real persistence across requests and manager A vs manager B, and record checks on integrated branch.
