import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import {
  toTeam,
  teamRecordSchema,
  teamMembershipRecordSchema,
} from '@uf-esports-hub/shared';
import { teams, teamMemberships } from '../src/db/schema.js';

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));
const seed = readFileSync(new URL('../seeds/teams.sql', import.meta.url), 'utf8');
const ownerId = '70000000-0000-4000-8000-000000000001';
const playerId = '70000000-0000-4000-8000-000000000002';
const rocketLeagueTeamId = '71000000-0000-4000-8000-000000000001';
const valorantTeamId = '71000000-0000-4000-8000-000000000002';
const missingId = '72000000-0000-4000-8000-000000000001';

test('team migrations and constraints on disposable PostgreSQL (PGlite)', async (t) => {
  const pg = new PGlite();
  const db = drizzle(pg);
  t.after(() => pg.close());
  function expectDatabaseError(sql: string, params: unknown[], code: string | RegExp) {
    return assert.rejects(pg.query(sql, params), { code });
  }

  await t.test('full migration chain and rerun succeed; development seed is repeatable', async () => {
    await migrate(db, { migrationsFolder });
    await migrate(db, { migrationsFolder });
    await pg.exec(seed);
    await pg.exec(seed);
    const teams = await pg.query('SELECT count(*)::int AS count FROM teams');
    const memberships = await pg.query('SELECT count(*)::int AS count FROM team_memberships');
    const profiles = await pg.query('SELECT count(*)::int AS count FROM player_profiles');

    assert.deepEqual(teams.rows, [{ count: 2 }]);
    assert.deepEqual(memberships.rows, [{ count: 2 }]);
    assert.deepEqual(profiles.rows, [{ count: 2 }]);
  });

  await t.test('team names are case-insensitively unique per normalized game on insert and update', async () => {
    await expectDatabaseError(
      'INSERT INTO teams (name, game, manager_id) VALUES ($1, $2, $3)',
      [' demo GATORS ', ' ROCKET LEAGUE ', ownerId],
      '23505',
    );
    await expectDatabaseError(
      'INSERT INTO teams (name, game, manager_id) VALUES ($1, $2, $3)',
      ['Demo Gators', 'Rocket League', playerId],
      '23505',
    );
    await expectDatabaseError(
      'UPDATE teams SET game = $1 WHERE id = $2',
      ['rocket league', valorantTeamId],
      '23505',
    );
    // The fixture already demonstrates the same name in two different games.
    const [team] = await db.insert(teams).values({
      name: 'New name',
      game: 'Rocket League',
      managerId: ownerId,
    }).returning();
    assert.ok(team);
    assert.equal(team.description, '');
    assert.equal(teamRecordSchema.safeParse(team).success, true);
    assert.equal(toTeam(team).id, team.id);
    await db.delete(teams).where(eq(teams.id, team.id));
  });

  await t.test('ownership and both membership foreign keys require existing records', async () => {
    await expectDatabaseError(
      'INSERT INTO teams (name, game, manager_id) VALUES ($1, $2, $3)',
      ['Missing owner', 'Game', missingId],
      '23503',
    );
    await expectDatabaseError(
      'INSERT INTO team_memberships (team_id, player_id) VALUES ($1, $2)',
      [missingId, playerId],
      '23503',
    );
    await expectDatabaseError(
      'INSERT INTO team_memberships (team_id, player_id) VALUES ($1, $2)',
      [rocketLeagueTeamId, missingId],
      '23503',
    );
    await expectDatabaseError(
      'INSERT INTO teams (name, game) VALUES ($1, $2)',
      ['No owner', 'Game'],
      '23502',
    );
  });

  await t.test('rosters forbid duplicate players while allowing membership in multiple teams', async () => {
    await expectDatabaseError(
      'INSERT INTO team_memberships (team_id, player_id) VALUES ($1, $2)',
      [rocketLeagueTeamId, playerId],
      '23505',
    );
    const memberships = await db.select().from(teamMemberships)
      .where(eq(teamMemberships.playerId, playerId));
    assert.equal(memberships.length, 2);
    for (const membership of memberships) {
      assert.equal(teamMembershipRecordSchema.safeParse(membership).success, true);
    }
    // Ownership does not automatically create membership, but does not prohibit it either.
    await db.insert(teamMemberships).values({ teamId: rocketLeagueTeamId, playerId: ownerId });
    await db.delete(teamMemberships).where(eq(teamMemberships.playerId, ownerId));
  });

  await t.test('database writers cannot bypass required fields or storage limits', async () => {
    const fieldLimits = [['name', 100], ['game', 80], ['description', 500]] as const;
    for (const [field, limit] of fieldLimits) {
      await expectDatabaseError(
        `UPDATE teams SET ${field} = $1 WHERE id = $2`,
        ['x'.repeat(limit + 1), rocketLeagueTeamId],
        '22001',
      );
      await expectDatabaseError(
        `UPDATE teams SET ${field} = NULL WHERE id = $1`,
        [rocketLeagueTeamId],
        '23502',
      );
    }
    for (const field of ['name', 'game']) {
      await expectDatabaseError(
        `UPDATE teams SET ${field} = $1 WHERE id = $2`,
        ['   ', rocketLeagueTeamId],
        '23514',
      );
    }
  });

  await t.test('Drizzle refreshes updatedAt and preserves createdAt', async () => {
    await pg.query('UPDATE teams SET updated_at = $1 WHERE id = $2', [
      '2020-01-01T00:00:00Z', rocketLeagueTeamId,
    ]);
    const [before] = await db.select().from(teams).where(eq(teams.id, rocketLeagueTeamId));
    const [after] = await db.update(teams)
      .set({ description: 'Edited' })
      .where(eq(teams.id, rocketLeagueTeamId))
      .returning();
    assert.equal(after.createdAt.getTime(), before.createdAt.getTime());
    assert.ok(after.updatedAt.getTime() > before.updatedAt.getTime());
    assert.equal(after.description, 'Edited');
    await pg.exec(seed);
    const [reseeded] = await db.select().from(teams).where(eq(teams.id, rocketLeagueTeamId));
    assert.equal(reseeded.description, 'Edited');
  });

  await t.test('owner deletion is restricted; team and player deletion cascade only memberships', async () => {
    // PostgreSQL versions can report RESTRICT violation or foreign-key violation.
    await expectDatabaseError('DELETE FROM users WHERE id = $1', [ownerId], /^(23001|23503)$/);
    await pg.query('DELETE FROM teams WHERE id = $1', [rocketLeagueTeamId]);

    const remainingMemberships = await pg.query(
      'SELECT team_id FROM team_memberships WHERE player_id = $1', [playerId],
    );
    const player = await pg.query('SELECT id FROM users WHERE id = $1', [playerId]);
    assert.deepEqual(remainingMemberships.rows, [{ team_id: valorantTeamId }]);
    assert.equal(player.rows.length, 1);

    await pg.query('DELETE FROM users WHERE id = $1', [playerId]);
    assert.equal((await pg.query('SELECT * FROM team_memberships')).rows.length, 0);
    const remainingTeam = await pg.query('SELECT id FROM teams WHERE id = $1', [valorantTeamId]);
    assert.equal(remainingTeam.rows.length, 1);

    await pg.query('DELETE FROM teams WHERE id = $1', [valorantTeamId]);
    await pg.query('DELETE FROM users WHERE id = $1', [ownerId]);
  });
});

test('team migration upgrades an existing account/profile database without rewriting records', async (t) => {
  const pg = new PGlite();
  t.after(() => pg.close());
  for (const file of ['0000_initial_users', '0001_open_leader', '0002_backfill_player_profiles']) {
    await pg.exec(readFileSync(new URL(`../drizzle/${file}.sql`, import.meta.url), 'utf8'));
  }
  await pg.query(
    'INSERT INTO users (id, username, email, hashed_password) VALUES ($1, $2, $3, $4)',
    [ownerId, 'Existing user', 'existing@example.invalid', 'existing-hash'],
  );
  await pg.query(
    'INSERT INTO player_profiles (user_id, display_name, bio) VALUES ($1, $2, $3)',
    [ownerId, 'Saved display name', 'Saved bio'],
  );
  const profileQuery = 'SELECT * FROM users JOIN player_profiles ON users.id = player_profiles.user_id';
  const before = await pg.query(profileQuery);

  await pg.exec(readFileSync(new URL('../drizzle/0003_team_schemas.sql', import.meta.url), 'utf8'));

  const after = await pg.query(profileQuery);
  assert.deepEqual(after.rows, before.rows);
  assert.equal((await pg.query('SELECT * FROM teams')).rows.length, 0);
});
