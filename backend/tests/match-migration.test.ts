import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { and, asc, eq, gte, lt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { matchFieldLimits, matchRecordSchema, matchSchema, toMatch } from '@uf-esports-hub/shared';
import { matches } from '../src/db/schema.js';

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));
const teamSeed = readFileSync(new URL('../seeds/teams.sql', import.meta.url), 'utf8');
const matchId = '73000000-0000-4000-8000-000000000001';
const teamId = '71000000-0000-4000-8000-000000000001';
const otherTeamId = '71000000-0000-4000-8000-000000000002';
const missingId = '74000000-0000-4000-8000-000000000001';
const scheduledAt = new Date('2026-12-01T23:00:00.000Z');

test('match migrations and constraints on disposable PostgreSQL (PGlite)', async (t) => {
  const pg = new PGlite();
  const db = drizzle(pg);
  t.after(() => pg.close());

  function expectDatabaseError(sql: string, params: unknown[], code: string | RegExp) {
    return assert.rejects(pg.query(sql, params), { code });
  }

  await t.test('full migration chain and rerun succeed; defaults produce a valid match record', async () => {
    await migrate(db, { migrationsFolder });
    await migrate(db, { migrationsFolder });
    await pg.exec(teamSeed);
    assert.equal((await pg.query('SELECT * FROM matches')).rows.length, 0);

    const [generated] = await db.insert(matches).values({ teamId, opponent: 'Seminoles', scheduledAt })
      .returning();
    assert.ok(generated);
    assert.equal(matchRecordSchema.safeParse(generated).success, true);
    assert.equal(generated.status, 'scheduled');
    assert.equal(generated.location, '');
    assert.equal(generated.notes, '');
    assert.equal(generated.teamScore, null);
    assert.equal(generated.opponentScore, null);
    assert.equal(generated.scheduledAt.toISOString(), scheduledAt.toISOString());
    assert.equal(matchSchema.safeParse(toMatch(generated)).success, true);
    await db.delete(matches).where(eq(matches.id, generated.id));
    await db.insert(matches).values({ id: matchId, teamId, opponent: 'Seminoles', scheduledAt });
  });

  await t.test('team identity must reference an existing team', async () => {
    await expectDatabaseError(
      'INSERT INTO matches (team_id, opponent, scheduled_at) VALUES ($1, $2, $3)',
      [missingId, 'Opponent', scheduledAt],
      '23503',
    );
    await expectDatabaseError(
      'UPDATE matches SET team_id = $1 WHERE id = $2', [missingId, matchId], '23503',
    );
  });

  await t.test('required fields, text lengths, and nonblank opponents are enforced for SQL writers', async () => {
    for (const field of ['team_id', 'opponent', 'scheduled_at', 'location', 'notes', 'status']) {
      await expectDatabaseError(`UPDATE matches SET ${field} = NULL WHERE id = $1`, [matchId], '23502');
    }
    for (const field of ['opponent', 'location', 'notes'] as const) {
      const atLimit = 'x'.repeat(matchFieldLimits[field]);
      await pg.query(`UPDATE matches SET ${field} = $1 WHERE id = $2`, [atLimit, matchId]);
      await expectDatabaseError(
        `UPDATE matches SET ${field} = $1 WHERE id = $2`, [`${atLimit}x`, matchId], '22001',
      );
    }
    for (const opponent of ['', '   ']) {
      await expectDatabaseError('UPDATE matches SET opponent = $1 WHERE id = $2', [opponent, matchId], '23514');
    }
    await pg.query('UPDATE matches SET opponent = $1, location = $2, notes = $2 WHERE id = $3', [
      'Seminoles', '', matchId,
    ]);
  });

  await t.test('scheduling timestamps store UTC instants and reject infinity', async () => {
    for (const time of ['infinity', '-infinity']) {
      await expectDatabaseError('UPDATE matches SET scheduled_at = $1 WHERE id = $2', [time, matchId], '23514');
    }
    await pg.query('UPDATE matches SET scheduled_at = $1 WHERE id = $2', ['2026-12-01T18:00:00-05:00', matchId]);
    const [row] = await db.select().from(matches).where(eq(matches.id, matchId));
    assert.equal(toMatch(row).scheduledAt, scheduledAt.toISOString());
  });

  await t.test('only completed matches have both scores; partial results are always rejected', async () => {
    const update = 'UPDATE matches SET status = $1, team_score = $2, opponent_score = $3 WHERE id = $4';
    for (const status of ['scheduled', 'completed', 'cancelled']) {
      for (const [teamScore, opponentScore] of [[null, null], [0, 0], [2, null], [null, 1]]) {
        const valid = status === 'completed'
          ? teamScore !== null && opponentScore !== null
          : teamScore === null && opponentScore === null;
        const params = [status, teamScore, opponentScore, matchId];
        if (valid) {
          await pg.query(update, params);
          const [row] = await db.select().from(matches).where(eq(matches.id, matchId));
          assert.equal(matchRecordSchema.safeParse(row).success, true);
          assert.equal(matchSchema.safeParse(toMatch(row)).success, true);
        } else {
          await expectDatabaseError(update, params, '23514');
        }
      }
    }
    await expectDatabaseError('UPDATE matches SET status = $1 WHERE id = $2', ['unknown', matchId], '23514');
    await pg.query('UPDATE matches SET status = $1 WHERE id = $2', ['scheduled', matchId]);
  });

  await t.test('scores support zero, draws, and the integer ceiling but reject negatives and overflow', async () => {
    for (const score of [0, matchFieldLimits.score]) {
      await pg.query(
        "UPDATE matches SET status = 'completed', team_score = $1, opponent_score = $1 WHERE id = $2",
        [score, matchId],
      );
      const [row] = await db.select().from(matches).where(eq(matches.id, matchId));
      assert.deepEqual(toMatch(row).result, { teamScore: score, opponentScore: score });
    }
    for (const field of ['team_score', 'opponent_score']) {
      await expectDatabaseError(`UPDATE matches SET ${field} = -1 WHERE id = $1`, [matchId], '23514');
      await expectDatabaseError(
        `UPDATE matches SET ${field} = $1 WHERE id = $2`, [matchFieldLimits.score + 1, matchId], '22003',
      );
      await expectDatabaseError(`UPDATE matches SET ${field} = $1 WHERE id = $2`, ['1.5', matchId], '22P02');
    }
    await pg.query(
      "UPDATE matches SET status = 'scheduled', team_score = NULL, opponent_score = NULL WHERE id = $1",
      [matchId],
    );
  });

  await t.test('calendar reads use half-open bounds and stable ordering without forbidding rematches', async () => {
    const from = new Date('2027-01-01T00:00:00Z');
    const to = new Date('2027-02-01T00:00:00Z');
    const firstId = '73000000-0000-4000-8000-000000000002';
    const secondId = '73000000-0000-4000-8000-000000000003';
    const otherId = '73000000-0000-4000-8000-000000000004';
    const endId = '73000000-0000-4000-8000-000000000005';
    await db.insert(matches).values([
      { id: secondId, teamId, opponent: 'Repeated opponent', scheduledAt: from },
      { id: firstId, teamId, opponent: 'Repeated opponent', scheduledAt: from },
      { id: otherId, teamId: otherTeamId, opponent: 'Other team', scheduledAt: from },
      { id: endId, teamId, opponent: 'At exclusive end', scheduledAt: to },
    ]);
    const range = and(gte(matches.scheduledAt, from), lt(matches.scheduledAt, to));
    const allTeams = await db.select().from(matches).where(range).orderBy(asc(matches.scheduledAt), asc(matches.id));
    assert.deepEqual(allTeams.map((row) => row.id), [firstId, secondId, otherId]);
    const oneTeam = await db.select().from(matches).where(and(range, eq(matches.teamId, teamId)))
      .orderBy(asc(matches.scheduledAt), asc(matches.id));
    assert.deepEqual(oneTeam.map((row) => row.id), [firstId, secondId]);
    await db.delete(matches).where(gte(matches.scheduledAt, from));
  });

  await t.test('Drizzle refreshes updatedAt while preserving createdAt', async () => {
    await pg.query('UPDATE matches SET updated_at = $1 WHERE id = $2', ['2020-01-01T00:00:00Z', matchId]);
    const [before] = await db.select().from(matches).where(eq(matches.id, matchId));
    const [after] = await db.update(matches).set({ notes: 'Edited' }).where(eq(matches.id, matchId)).returning();
    assert.equal(after.createdAt.getTime(), before.createdAt.getTime());
    assert.ok(after.updatedAt.getTime() > before.updatedAt.getTime());
    assert.equal(after.notes, 'Edited');
  });

  await t.test('team deletion preserves scheduled, cancelled, and completed matches until explicit removal', async () => {
    for (const status of ['scheduled', 'cancelled', 'completed']) {
      const score = status === 'completed' ? 0 : null;
      await pg.query('UPDATE matches SET status = $1, team_score = $2, opponent_score = $2 WHERE id = $3', [
        status, score, matchId,
      ]);
      await expectDatabaseError('DELETE FROM teams WHERE id = $1', [teamId], /^(23001|23503)$/);
    }
    const before = await pg.query('SELECT * FROM team_memberships ORDER BY team_id, player_id');
    await db.delete(matches).where(eq(matches.id, matchId));
    assert.equal((await pg.query('SELECT id FROM teams WHERE id = $1', [teamId])).rows.length, 1);
    assert.equal((await pg.query('SELECT id FROM users')).rows.length, 2);
    assert.deepEqual((await pg.query('SELECT * FROM team_memberships ORDER BY team_id, player_id')).rows, before.rows);
    await pg.query('DELETE FROM teams WHERE id = $1', [teamId]);
    assert.equal((await pg.query('SELECT id FROM teams WHERE id = $1', [otherTeamId])).rows.length, 1);
  });
});

test('match migration upgrades an existing team database without rewriting its data', async (t) => {
  const pg = new PGlite();
  t.after(() => pg.close());
  for (const file of [
    '0000_initial_users', '0001_open_leader', '0002_backfill_player_profiles', '0003_team_schemas',
  ]) {
    await pg.exec(readFileSync(new URL(`../drizzle/${file}.sql`, import.meta.url), 'utf8'));
  }
  await pg.exec(teamSeed);
  await pg.query('UPDATE teams SET description = $1 WHERE id = $2', ['Saved description', teamId]);
  const existingTables = ['users', 'player_profiles', 'teams', 'team_memberships'];
  const before = [];
  for (const table of existingTables) {
    before.push((await pg.query(`SELECT * FROM ${table} ORDER BY 1, 2`)).rows);
  }

  await pg.exec(readFileSync(new URL('../drizzle/0004_match_schemas.sql', import.meta.url), 'utf8'));

  for (const [index, table] of existingTables.entries()) {
    assert.deepEqual((await pg.query(`SELECT * FROM ${table} ORDER BY 1, 2`)).rows, before[index]);
  }
  assert.equal((await pg.query('SELECT * FROM matches')).rows.length, 0);
});
