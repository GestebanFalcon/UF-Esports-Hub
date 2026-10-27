import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: text('username').notNull(),
  email: text('email').notNull(),
  hashedPassword: text('hashed_password').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('users_username_unique').on(sql`lower(${table.username})`),
  uniqueIndex('users_email_unique').on(sql`lower(${table.email})`),
]);

export type { User, UserRecord } from '@uf-esports-hub/shared';
export type DatabaseUser = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
