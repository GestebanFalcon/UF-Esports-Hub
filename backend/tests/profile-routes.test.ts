import assert from 'node:assert/strict';
import { once } from 'node:events';
import { describe, test } from 'node:test';
import express from 'express';
import { SignJWT } from 'jose';
import type { ProfileStore } from '../src/routes/profile/index.js';
import { profilePaths, type ProfileResponse } from '@uf-esports-hub/shared';

process.env.JWT_SECRET = 'test-only-signing-secret-with-at-least-32-bytes';
process.env.JWT_EXPIRES_IN_SECONDS = '900';
const { createProfileRouter } = await import('../src/routes/profile/index.js');
const { createAccessToken } = await import('../src/auth/tokens.js');
const { authConfig } = await import('../src/auth/config.js');

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const fixture = (userId: string): ProfileResponse => ({
  displayName: userId === ALICE ? 'Alice' : 'Bob',
  favoriteGame: 'Valorant', bio: 'Player',
});

const aliceToken = (await createAccessToken(ALICE)).accessToken;
const bobToken = (await createAccessToken(BOB)).accessToken;

async function setup({ initial = true, store: providedStore }: {
  initial?: boolean;
  store?: ProfileStore;
} = {}) {
  const records = new Map<string, ProfileResponse>();
  if (initial) { records.set(ALICE, fixture(ALICE)); records.set(BOB, fixture(BOB)); }
  const store: ProfileStore = providedStore ?? {
    async getByUserId(id) { return records.get(id) ?? null; },
    async updateByUserId(id, values) {
      const original = records.get(id);
      if (!original) return null;
      const next = { ...original, ...values };
      records.set(id, next);
      return next;
    },
  };
  const app = express();
  app.use(express.json());
  app.use(profilePaths.self, createProfileRouter({ store }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}${profilePaths.self}`;
  async function request(method: string, body?: unknown, token = aliceToken) {
    return fetch(url, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  return {
    request, records,
    close: () => new Promise<void>((resolve, reject) => {
      server.close(err => err ? reject(err) : resolve());
      server.closeAllConnections();
    }),
  };
}

describe('self profile endpoints', () => {
  test('reads only the authenticated user\'s public profile', async (t) => {
    const ctx = await setup();
    t.after(ctx.close);
    const alice = await ctx.request('GET');
    assert.equal(alice.status, 200);
    assert.equal(alice.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await alice.json(), fixture(ALICE));
    const bob = await ctx.request('GET', undefined, bobToken);
    assert.equal(bob.status, 200);
    assert.deepEqual(await bob.json(), fixture(BOB));
  });

  test('rejects missing and invalid authentication', async (t) => {
    const ctx = await setup();
    t.after(ctx.close);
    assert.equal((await ctx.request('GET', undefined, '')).status, 401);
    assert.equal((await ctx.request('PATCH', { displayName: 'X' }, 'invalid')).status, 401);
  });

  test('invalid, expired, and invalid-subject tokens never reach the store', async (t) => {
    const ctx = await setup({ store: {
      async getByUserId() { assert.fail('Unauthenticated read'); },
      async updateByUserId() { assert.fail('Unauthenticated write'); },
    } });
    t.after(ctx.close);
    const now = Math.floor(Date.now() / 1000);
    const sign = (subject: string, expiresAt: number) => new SignJWT({})
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(subject).setIssuer(authConfig.issuer).setAudience(authConfig.audience)
      .setIssuedAt(now - 60).setExpirationTime(expiresAt).sign(authConfig.secret);
    for (const token of ['', 'forged', await sign(ALICE, now - 1), await sign('invalid-user-id', now + 60)]) {
      for (const method of ['GET', 'PATCH']) {
        const response = await ctx.request(method, method === 'PATCH' ? { bio: 'Update' } : undefined, token);
        assert.equal(response.status, 401);
        assert.ok(response.headers.get('www-authenticate'));
      }
    }
  });

  test('persists partial own changes without touching another player', async (t) => {
    const ctx = await setup();
    t.after(ctx.close);
    const changed = await ctx.request('PATCH', { displayName: 'New Alice' });
    assert.equal(changed.status, 200);
    assert.deepEqual(await changed.json(), { ...fixture(ALICE), displayName: 'New Alice' });
    assert.deepEqual(await (await ctx.request('GET')).json(), { ...fixture(ALICE), displayName: 'New Alice' });
    assert.deepEqual(ctx.records.get(BOB), fixture(BOB));
  });

  test('accepts database field limits and nullable fields', async (t) => {
    const ctx = await setup();
    t.after(ctx.close);
    const limits = { displayName: 'A'.repeat(40), favoriteGame: 'G'.repeat(60), bio: 'B'.repeat(500) };
    const changed = await ctx.request('PATCH', limits);
    assert.equal(changed.status, 200);
    assert.deepEqual(await changed.json(), limits);
    const cleared = await ctx.request('PATCH', { favoriteGame: null, bio: null });
    assert.equal(cleared.status, 200);
    assert.deepEqual(await cleared.json(), { displayName: limits.displayName, favoriteGame: null, bio: null });
  });

  test('rejects ownership, account fields, and invalid profile fields', async (t) => {
    const ctx = await setup();
    t.after(ctx.close);
    for (const patch of [
      { userId: BOB, displayName: 'Hack' }, { role: 'admin' }, { email: 'new@ufl.edu' },
      {}, { displayName: '' }, { displayName: '  ' }, { displayName: 'A'.repeat(41) },
      { displayName: null }, { favoriteGame: 'A'.repeat(61) }, { bio: 'A'.repeat(501) },
    ]) assert.equal((await ctx.request('PATCH', patch)).status, 400);
    const invalid = await ctx.request('PATCH', { displayName: 'A'.repeat(41) });
    assert.ok((await invalid.json()).fieldErrors.displayName);
    assert.deepEqual(ctx.records.get(ALICE), fixture(ALICE));
    assert.deepEqual(ctx.records.get(BOB), fixture(BOB));
  });

  test('serializes public fields without exposing stored ownership or account data', async (t) => {
    const stored = {
      ...fixture(ALICE), userId: ALICE, email: 'private@ufl.edu', hashedPassword: 'private hash',
      role: 'admin', createdAt: new Date(), updatedAt: new Date(),
    };
    const ctx = await setup({ store: {
      async getByUserId() { return stored; },
      async updateByUserId() { return stored; },
    } });
    t.after(ctx.close);
    for (const response of [await ctx.request('GET'), await ctx.request('PATCH', { bio: 'Updated' })]) {
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), fixture(ALICE));
    }
  });

  test('missing profile returns 404 for read and update without creating a row', async (t) => {
    const ctx = await setup({ initial: false });
    t.after(ctx.close);
    assert.equal((await ctx.request('GET')).status, 404);
    assert.equal((await ctx.request('PATCH', { displayName: 'Alice' })).status, 404);
    assert.equal(ctx.records.size, 0);
  });

  test('store failures return 500 without exposing sensitive errors', async (t) => {
    const errors = t.mock.method(console, 'error', () => {});
    const ctx = await setup({ store: {
      async getByUserId() { throw Error('private database secret'); },
      async updateByUserId() { throw Error('private database secret'); },
    } });
    t.after(ctx.close);
    for (const res of [await ctx.request('GET'), await ctx.request('PATCH', { bio: 'Update' })]) {
      assert.equal(res.status, 500);
      assert.doesNotMatch(await res.text(), /private database secret/);
    }
    assert.equal(errors.mock.callCount(), 2);
  });

});
