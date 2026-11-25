import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgTable,
  primaryKey,
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

// Ownership is independent of a user's global role; route authorization checks both.
export const teams = pgTable('teams', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  game: varchar('game', { length: 80 }).notNull(),
  description: varchar('description', { length: 500 }).default('').notNull(),
  managerId: uuid('manager_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('teams_game_name_unique').on(
    sql`lower(btrim(${table.game}))`,
    sql`lower(btrim(${table.name}))`,
  ),
  index('teams_manager_id_idx').on(table.managerId),
  check('teams_name_not_blank', sql`length(btrim(${table.name})) > 0`),
  check('teams_game_not_blank', sql`length(btrim(${table.game})) > 0`),
]);

// A player may join multiple teams, but may appear only once on each roster.
export const teamMemberships = pgTable('team_memberships', {
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  playerId: uuid('player_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.teamId, table.playerId] }),
  index('team_memberships_player_id_idx').on(table.playerId),
]);

export type { User, UserRecord } from '@uf-esports-hub/shared';
export type DatabaseUser = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type DatabaseTeam = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type DatabaseTeamMembership = typeof teamMemberships.$inferSelect;
export type NewTeamMembership = typeof teamMemberships.$inferInsert;
