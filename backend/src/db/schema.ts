import { sql } from 'drizzle-orm';
import { matchFieldLimits, type MatchStatus } from '@uf-esports-hub/shared';
import {
  check,
  index,
  integer,
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

// Each fixture belongs to one managed team, including fixtures against external opponents.
export const matches = pgTable('matches', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'restrict' }),
  opponent: varchar('opponent', { length: matchFieldLimits.opponent }).notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  location: varchar('location', { length: matchFieldLimits.location }).default('').notNull(),
  notes: varchar('notes', { length: matchFieldLimits.notes }).default('').notNull(),
  status: varchar('status', { length: 9 }).$type<MatchStatus>()
    .default('scheduled').notNull(),
  teamScore: integer('team_score'),
  opponentScore: integer('opponent_score'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => [
  index('matches_scheduled_at_id_idx').on(table.scheduledAt, table.id),
  index('matches_team_id_scheduled_at_id_idx').on(table.teamId, table.scheduledAt, table.id),
  check('matches_opponent_not_blank', sql`length(btrim(${table.opponent})) > 0`),
  check('matches_scheduled_at_finite', sql`isfinite(${table.scheduledAt})`),
  check('matches_status_valid', sql`${table.status} IN ('scheduled', 'completed', 'cancelled')`),
  check('matches_team_score_nonnegative', sql`${table.teamScore} >= 0`),
  check('matches_opponent_score_nonnegative', sql`${table.opponentScore} >= 0`),
  check('matches_result_state', sql`(
    ${table.status} = 'completed' AND ${table.teamScore} IS NOT NULL AND ${table.opponentScore} IS NOT NULL
  ) OR (
    ${table.status} IN ('scheduled', 'cancelled') AND ${table.teamScore} IS NULL AND ${table.opponentScore} IS NULL
  )`),
]);

export type { User, UserRecord } from '@uf-esports-hub/shared';
export type DatabaseUser = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type DatabaseTeam = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type DatabaseTeamMembership = typeof teamMemberships.$inferSelect;
export type NewTeamMembership = typeof teamMemberships.$inferInsert;
export type DatabaseMatch = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
