import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

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

// this gives each user one profile and keeps account info in the users table
export const playerProfiles = pgTable('player_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  displayName: varchar('display_name', { length: 40 }).notNull(),
  favoriteGame: varchar('favorite_game', { length: 60 }),
  bio: varchar('bio', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type { User, UserRecord } from '@uf-esports-hub/shared';
export type DatabaseUser = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
