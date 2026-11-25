import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { after, before, beforeEach, mock, test } from 'node:test';
import { PgDialect } from 'drizzle-orm/pg-core';
import { profilePaths, toProfile, type ProfileRecord, type ProfileUpdate } from '@uf-esports-hub/shared';
import { playerProfiles } from '../src/db/schema.js';

// Exercise the mounted app and real store without connecting to a database.
process.env.DATABASE_URL = 'postgresql://unused:unused@localhost/unused';
process.env.JWT_SECRET = 'test-only-signing-secret-with-at-least-32-bytes';
process.env.JWT_EXPIRES_IN_SECONDS = '900';
const { app } = await import('../src/app.js');
const { db, pool } = await import('../src/db/index.js');
const { createAccessToken } = await import('../src/auth/tokens.js');

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const fixture = (userId: string): ProfileRecord => ({
  userId, displayName: userId === ALICE ? 'Alice' : 'Bob', favoriteGame: null, bio: null,
  createdAt: new Date('2026-10-20T12:00:00Z'), updatedAt: new Date('2026-10-20T12:00:00Z'),
});
const aliceToken = (await createAccessToken(ALICE)).accessToken;
const bobToken = (await createAccessToken(BOB)).accessToken;
let server: Server;
let url: string;
let records: Map<string, ProfileRecord>;
let queryCount: number;
const dialect = new PgDialect();

function owner(condition: Parameters<PgDialect['sqlToQuery']>[0]) {
  queryCount++;
  const query = dialect.sqlToQuery(condition);
  assert.match(query.sql, /"player_profiles"\."user_id" = \$1/);
  assert.equal(query.params.length, 1);
  return query.params[0] as string;
}

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  url = `http://127.0.0.1:${address.port}${profilePaths.self}`;
});

beforeEach(() => {
  mock.restoreAll();
  records = new Map([[ALICE, fixture(ALICE)], [BOB, fixture(BOB)]]);
  queryCount = 0;
  mock.method(db, 'select', (() => ({
    from(table: unknown) {
      assert.equal(table, playerProfiles);
      return { where(condition: Parameters<PgDialect['sqlToQuery']>[0]) {
        const userId = owner(condition);
        return { async limit() { return records.has(userId) ? [records.get(userId)] : []; } };
      } };
    },
  })) as unknown as typeof db.select);
  mock.method(db, 'update', ((table: unknown) => {
    assert.equal(table, playerProfiles);
    return { set(values: ProfileUpdate & { updatedAt: Date }) {
      assert.ok(values.updatedAt instanceof Date);
      return { where(condition: Parameters<PgDialect['sqlToQuery']>[0]) {
        const userId = owner(condition);
        return { async returning() {
          const original = records.get(userId);
          if (!original) return [];
          const next = { ...original, ...values };
          records.set(userId, next);
          return [next];
        } };
      } };
    } };
  }) as unknown as typeof db.update);
});

after(async () => {
  mock.restoreAll();
  await new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  });
  await pool.end();
});

function request(method: string, token = aliceToken, body?: unknown) {
  return fetch(url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test('mounted profile endpoint rejects credentials before database access', async () => {
  for (const token of ['', 'forged']) {
    assert.equal((await request('GET', token)).status, 401);
    assert.equal((await request('PATCH', token, { bio: 'Update' })).status, 401);
  }
  assert.equal(queryCount, 0);
});

test('mounted GET uses the verified user UUID and serializes only public fields', async () => {
  for (const [userId, token] of [[ALICE, aliceToken], [BOB, bobToken]] as const) {
    const response = await request('GET', token);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), toProfile(fixture(userId)));
  }
});

test('mounted PATCH persists only the owner\'s editable fields and updates the timestamp', async () => {
  const changed = await request('PATCH', aliceToken, { bio: 'Updated Alice' });
  assert.equal(changed.status, 200);
  assert.deepEqual(await changed.json(), { ...toProfile(fixture(ALICE)), bio: 'Updated Alice' });
  assert.deepEqual(await (await request('GET')).json(), { ...toProfile(fixture(ALICE)), bio: 'Updated Alice' });
  assert.deepEqual(records.get(BOB), fixture(BOB));
  assert.ok(records.get(ALICE)!.updatedAt > fixture(ALICE).updatedAt);
  const beforeInvalid = queryCount;
  assert.equal((await request('PATCH', aliceToken, { userId: BOB, bio: 'Hack' })).status, 400);
  assert.equal(queryCount, beforeInvalid);
});

test('missing profiles return 404 without silently creating a row', async () => {
  records.delete(ALICE);
  assert.equal((await request('GET')).status, 404);
  assert.equal((await request('PATCH', aliceToken, { bio: 'Update' })).status, 404);
  assert.equal(records.has(ALICE), false);
});
