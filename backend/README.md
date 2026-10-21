# UF Esports Hub backend

Express + TypeScript API with Drizzle ORM and PostgreSQL. Dependencies are managed with Bun; Node.js 22+ runs the built server.

## Setup

```sh
cd ../shared
bun install
bun run build
cd ../backend
bun install
cp .env.example .env
bun run dev
```

Set `DATABASE_URL` in `.env` to your PostgreSQL connection string and create the database before applying migrations. `PORT` defaults to 3001. `GET /health` returns `{ "status": "ok" }` and only checks the API process, not the database connection.

## Migrations

The initial migration is checked into `drizzle/` and is ready to apply:

```sh
bun run db:migrate
```

After changing `src/db/schema.ts`, run `bun run db:generate`, review the generated SQL, then run `bun run db:migrate`. Generation does not require a running database. Migration commands follow the [Drizzle migration workflow](https://orm.drizzle.team/docs/drizzle-kit-migrate).

`users` contains UUID `id`, required `username`, `email`, and `hashedPassword`, plus `createdAt` and `updatedAt` timestamps. Username and email have case-insensitive unique indexes. Hash passwords in the authentication layer before inserting; the schema does not perform hashing. `updatedAt` is automatically refreshed by Drizzle updates; raw SQL writers must update it explicitly. Profile fields and memberships can be added later.

## Checks and production

```sh
bun run typecheck
bun run build
bun run start
```

Import `db` from `src/db/index.ts` for database queries. No authentication or user CRUD endpoints are implemented yet.

Shared validation and types come from `@uf-esports-hub/shared`: use `UserRecord` for database rows and `toUser(row)` to produce the JSON-safe `User` without `hashedPassword`. Dev/build/typecheck scripts rebuild shared first. See [shared contracts](../shared/README.md).
