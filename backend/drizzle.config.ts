import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Generation works without a database; migrate/studio require DATABASE_URL.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  ...(process.env.DATABASE_URL
    ? { dbCredentials: { url: process.env.DATABASE_URL } }
    : {}),
});
