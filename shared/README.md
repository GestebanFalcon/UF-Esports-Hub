# Shared user contracts

Local package used by the frontend and backend. Zod is the source of truth for the TypeScript types.

Install dependencies with `bun install` in this folder, then run `bun run build`. Run `bun install` in the frontend and backend to link the package. Their dev/build scripts rebuild shared automatically. While editing shared during an active dev session, run `bun run dev` here in another terminal to watch for changes.

Build shared before installing the app dependencies on a fresh checkout. After adding new shared files or exports, rebuild shared and rerun `bun install` in both apps so Bun refreshes the local package files.

```ts
import { userSchema, toUser, type User } from '@uf-esports-hub/shared';

// Backend: convert a Drizzle user row to validated JSON-safe data.
const response = toUser(databaseRow);

// Frontend: validate JSON received from the API.
const user: User = userSchema.parse(await responseFromApi.json());
```

`User` / `userSchema` contain `id`, `username`, `email`, `createdAt`, and `updatedAt`. Timestamps are ISO UTC strings. Parsing strips unknown fields, including `hashedPassword`.

`UserRecord` / `userRecordSchema` match the database row: timestamps are `Date` objects and `hashedPassword` is required. Use these internally; call `toUser` before sending a row to the frontend. Hashing stays in the backend authentication layer. These schemas validate data without changing username or email casing.

`NewUser` remains inferred from Drizzle in the backend because database defaults make insert fields optional. Profile and membership fields can be added later. No database migration is required by this package.

Run `bun run test` for validation and serialization tests. Schema APIs follow the [Zod documentation](https://zod.dev/api).
