import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { after, before, beforeEach, mock, test } from 'node:test';
import { compare, hash } from 'bcryptjs';
import { SignJWT, decodeJwt } from 'jose';
import { PgDialect } from 'drizzle-orm/pg-core';
import express from 'express';
import { loginResponseSchema } from '@uf-esports-hub/shared';

// Tests exercise the HTTP API with a stubbed database, never a developer database.
process.env.DATABASE_URL = 'postgresql://unused:unused@localhost/unused';
process.env.JWT_SECRET = 'test-only-signing-secret-with-at-least-32-bytes';
process.env.JWT_EXPIRES_IN_SECONDS = '900';

const { app } = await import('../src/app.js');
const { db, pool } = await import('../src/db/index.js');
const { authConfig, readAuthConfig } = await import('../src/auth/config.js');
const { createAccessToken, verifyAccessToken } = await import('../src/auth/tokens.js');
const { loginIpRateLimit, loginRateLimit, registrationRateLimit } = await import('../src/middleware/auth-rate-limit.js');

const password = ' correct horse battery staple ';
const user = {
  id: 'b48653da-1234-4567-89ab-123456789abc',
  username: 'Gator',
  email: 'player@ufl.edu',
  hashedPassword: await hash(password, 12),
  createdAt: new Date('2026-10-20T12:00:00Z'),
  updatedAt: new Date('2026-10-20T12:00:00Z'),
};

let server: Server;
let baseUrl: string;
let rows: typeof user[];
let databaseError: Error | undefined;
let queryCount: number;
let queryParams: unknown[];
let querySql: string;

before(async () => {
  // Exercise successful-request accounting without hashing hundreds of passwords.
  const testApp = express();
  testApp.post('/rate-limit-test/register', registrationRateLimit, (_req, res) => res.sendStatus(201));
  testApp.post('/rate-limit-test/login', loginIpRateLimit, (_req, res) => res.sendStatus(204));
  testApp.use(app);
  server = testApp.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(() => {
  mock.restoreAll();
  loginIpRateLimit.resetKey('127.0.0.1');
  registrationRateLimit.resetKey('127.0.0.1');
  for (const email of [user.email, 'other@ufl.edu', 'invalid-email']) {
    const emailKey = createHash('sha256').update(email).digest('hex');
    loginRateLimit.resetKey(`127.0.0.1:${emailKey}`);
  }
  rows = [user];
  databaseError = undefined;
  queryCount = 0;
  queryParams = [];
  querySql = '';
  mock.method(db, 'select', (() => ({
    from: () => ({
      where: (condition: Parameters<PgDialect['sqlToQuery']>[0]) => {
        queryCount++;
        const query = new PgDialect().sqlToQuery(condition);
        queryParams = query.params;
        querySql = query.sql;
        return {
          limit: async () => {
            if (databaseError) throw databaseError;
            return rows;
          },
        };
      },
    }),
  })) as unknown as typeof db.select);
});

after(async () => {
  mock.restoreAll();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  });
  await pool.end();
});

async function login(body: unknown = { email: user.email, password }) {
  return fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function me(token?: string) {
  return fetch(`${baseUrl}/api/auth/me`, {
    headers: token === undefined ? {} : { Authorization: token },
  });
}

function assertPublicUser(body: { user: Record<string, unknown> }) {
  assert.deepEqual(body.user, {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  });
}

test('email login issues a signed, expiring bearer token and /me returns the public user', async () => {
  const response = await login({ email: 'PLAYER@UFL.EDU', password, id: 'ignored', admin: true });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json();
  assert.deepEqual(loginResponseSchema.parse(body), body);
  assertPublicUser(body);
  assert.equal(body.tokenType, 'Bearer');
  assert.equal(body.expiresIn, 900);
  assert.deepEqual(queryParams, [user.email]);
  assert.match(querySql, /lower\("users"\."email"\)/);
  const claims = decodeJwt(body.accessToken);
  assert.equal(claims.sub, user.id);
  assert.equal(claims.iss, authConfig.issuer);
  assert.equal(claims.aud, authConfig.audience);
  assert.equal(claims.exp! - claims.iat!, 900);
  assert.ok(claims.jti);
  assert.equal(claims.password, undefined);
  assert.equal(claims.hashedPassword, undefined);
  assert.equal(await verifyAccessToken(body.accessToken), user.id);

  const profile = await me(`bearer ${body.accessToken}`);
  assert.equal(profile.status, 200);
  assert.equal(profile.headers.get('cache-control'), 'no-store');
  assertPublicUser(await profile.json());
  assert.deepEqual(queryParams, [user.id]);
});

test('registration still hashes passwords and the new account can log in', async () => {
  rows = [];
  let stored: typeof user | undefined;
  mock.method(db, 'insert', (() => ({
    values: (values: Pick<typeof user, 'username' | 'email' | 'hashedPassword'>) => {
      stored = { ...user, ...values };
      return { onConflictDoNothing: () => ({ returning: async () => [stored] }) };
    },
  })) as unknown as typeof db.insert);
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ' Gator ', email: 'PLAYER@ufl.edu', password }),
  });
  assert.equal(response.status, 201);
  assertPublicUser(await response.json());
  assert.ok(stored);
  assert.notEqual(stored.hashedPassword, password);
  assert.ok(await compare(password, stored.hashedPassword));
  rows = [stored];
  assert.equal((await login()).status, 200);
});

test('unknown emails and incorrect passwords return the same 401 response', async () => {
  const wrongPassword = await login({ email: user.email, password: 'wrong' });
  rows = [];
  const unknownEmail = await login();
  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownEmail.status, 401);
  assert.deepEqual(await wrongPassword.json(), await unknownEmail.json());
});

test('password whitespace is significant', async () => {
  const response = await login({ email: user.email, password: password.trim() });
  assert.equal(response.status, 401);
});

test('invalid request bodies fail before querying the database', async () => {
  for (const body of [null, [], {}, { email: 'invalid', password },
    { email: user.email, password: '' }, { email: 12, password },
    { username: user.username, password }, { email: user.email, password: 12 }]) {
    assert.equal((await login(body)).status, 400);
  }
  assert.equal(queryCount, 0);
});

test('passwords exceeding bcrypt\'s byte limit are rejected, including multibyte inputs', async () => {
  for (const oversized of ['a'.repeat(73), '🐊'.repeat(19)]) {
    const response = await login({ email: user.email, password: oversized });
    assert.equal(response.status, 400);
    assert.ok((await response.json()).fieldErrors.password);
  }
  assert.equal(queryCount, 0);
});

test('malformed JSON and oversized bodies return JSON errors', async () => {
  for (const [body, status] of [['{', 400], [JSON.stringify({ data: 'x'.repeat(11000) }), 413]] as const) {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
    });
    assert.equal(response.status, status);
    assert.equal(typeof (await response.json()).message, 'string');
  }
  assert.equal(queryCount, 0);
});

test('unsupported charsets and encodings return 415 without logging server errors', async () => {
  const errors = mock.method(console, 'error', () => {});
  for (const headers of [
    { 'Content-Type': 'application/json; charset=iso-8859-1' },
    { 'Content-Type': 'application/json', 'Content-Encoding': 'unsupported' },
  ]) {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST', headers, body: '{}',
    });
    assert.equal(response.status, 415);
    assert.equal(typeof (await response.json()).message, 'string');
  }
  assert.equal(queryCount, 0);
  assert.equal(errors.mock.callCount(), 0);
});

test('missing or malformed authorization headers cannot access protected routes', async () => {
  for (const header of [undefined, 'Basic abc', 'Bearer', 'Bearer a b']) {
    const response = await me(header);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('www-authenticate'), 'Bearer');
  }
  assert.equal(queryCount, 0);
});

test('expired, forged, tampered and invalid-claim tokens are rejected before database access', async () => {
  const now = Math.floor(Date.now() / 1000);
  const sign = (overrides: Record<string, unknown> = {}, key = authConfig.secret, alg = 'HS256') =>
    new SignJWT({ sub: user.id, iss: authConfig.issuer, aud: authConfig.audience,
      iat: now, exp: now + 900, ...overrides })
      .setProtectedHeader({ alg, typ: 'JWT' }).sign(key);
  const { accessToken } = await createAccessToken(user.id);
  const parts = accessToken.split('.');
  parts[1] = Buffer.from(JSON.stringify({ ...decodeJwt(accessToken), sub: 'forged' })).toString('base64url');
  const tokens = [
    'not-a-jwt', parts.join('.'),
    await sign({ iat: now - 1000, exp: now - 1 }),
    await sign({}, new TextEncoder().encode('a-different-signing-key-that-is-long-enough')),
    await sign({}, authConfig.secret, 'HS384'),
    await sign({ iss: 'other-issuer' }), await sign({ aud: 'other-audience' }),
    await sign({ exp: undefined }), await sign({ sub: undefined }),
    await sign({ iat: undefined }), await sign({ sub: 'invalid-user-id' }),
    await sign({ nbf: now + 60 }), await sign({ iat: now + 60 }),
    await sign({ iat: now - 1000, exp: now + 1000 }),
  ];
  for (const token of tokens) {
    const response = await me(`Bearer ${token}`);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('www-authenticate'), 'Bearer error="invalid_token"');
  }
  assert.equal(queryCount, 0);
});

test('a valid token for a deleted user returns 401', async () => {
  rows = [];
  const { accessToken } = await createAccessToken(user.id);
  assert.equal((await me(`Bearer ${accessToken}`)).status, 401);
});

test('database failures return generic JSON without leaking internal errors', async () => {
  databaseError = new Error('private database connection details');
  const errors = mock.method(console, 'error', () => {});
  const response = await login();
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { message: 'Unable to log in right now.' });
  const { accessToken } = await createAccessToken(user.id);
  const profile = await me(`Bearer ${accessToken}`);
  assert.equal(profile.status, 500);
  assert.deepEqual(await profile.json(), { message: 'Unable to load your account right now.' });
  assert.equal(errors.mock.callCount(), 2);
});

test('login failures are isolated by normalized email and successes do not consume the failure quota', async () => {
  assert.equal((await login()).status, 200);
  for (let attempt = 0; attempt < 10; attempt++) {
    assert.equal((await login({ email: user.email, password: '' })).status, 400);
  }
  const blocked = await login({ email: 'PLAYER@UFL.EDU', password });
  assert.equal(blocked.status, 429);
  assert.ok(blocked.headers.get('retry-after'));
  assert.equal((await blocked.json()).message,
    'Too many failed login attempts for this email. Please try again later.');
  rows = [{ ...user, email: 'other@ufl.edu' }];
  assert.equal((await login({ email: 'other@ufl.edu', password })).status, 200);
  assert.equal(queryCount, 2);
  assert.equal((await fetch(`${baseUrl}/health`)).status, 200);
});

test('registration counts successful requests and its quota is independent of login', async () => {
  for (let attempt = 0; attempt < 50; attempt++) {
    assert.equal((await fetch(`${baseUrl}/rate-limit-test/register`, { method: 'POST' })).status, 201);
  }
  const blocked = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user.username, email: user.email, password }),
  });
  assert.equal(blocked.status, 429);
  assert.ok(blocked.headers.get('retry-after'));
  assert.deepEqual(await blocked.json(), { message: 'Too many registration requests. Please try again later.' });
  assert.equal(queryCount, 0);
  assert.equal((await login()).status, 200);
});

test('the broad IP login quota counts successful requests across emails', async () => {
  for (let attempt = 0; attempt < 300; attempt++) {
    assert.equal((await fetch(`${baseUrl}/rate-limit-test/login`, { method: 'POST' })).status, 204);
  }
  const blocked = await login({ email: 'other@ufl.edu', password });
  assert.equal(blocked.status, 429);
  assert.ok(blocked.headers.get('retry-after'));
  assert.deepEqual(await blocked.json(), { message: 'Too many login requests. Please try again later.' });
  assert.equal(queryCount, 0);
  const registration = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  });
  assert.equal(registration.status, 400);
});

test('auth configuration requires a secret and bounded integer token lifetimes', () => {
  for (const secret of [undefined, '', 'too-short']) {
    assert.throws(() => readAuthConfig({ JWT_SECRET: secret }), /JWT_SECRET/);
  }
  for (const lifetime of ['', '0', '-1', '1.5', 'NaN', 'Infinity', '86401']) {
    assert.throws(() => readAuthConfig({ JWT_SECRET: process.env.JWT_SECRET,
      JWT_EXPIRES_IN_SECONDS: lifetime }), /JWT_EXPIRES_IN_SECONDS/);
  }
  assert.equal(readAuthConfig({ JWT_SECRET: process.env.JWT_SECRET }).expiresIn, 900);
  assert.equal(readAuthConfig({ JWT_SECRET: process.env.JWT_SECRET, JWT_EXPIRES_IN_SECONDS: '60' }).expiresIn, 60);
});
