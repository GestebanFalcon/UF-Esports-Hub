import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../drizzle/0001_open_leader.sql', import.meta.url),
  'utf8',
);
const snapshot = JSON.parse(readFileSync(
  new URL('../drizzle/meta/0001_snapshot.json', import.meta.url),
  'utf8',
)) as { prevId: string; enums: Record<string, unknown> };
const baseSnapshot = JSON.parse(readFileSync(
  new URL('../drizzle/meta/0000_snapshot.json', import.meta.url),
  'utf8',
)) as { id: string };
const journal = JSON.parse(readFileSync(
  new URL('../drizzle/meta/_journal.json', import.meta.url),
  'utf8',
)) as { entries: Array<{ idx: number; tag: string }> };

test('profile migration enforces one user-owned profile and field storage limits', () => {
  for (const statement of [
    '"user_id" uuid PRIMARY KEY NOT NULL',
    '"display_name" varchar(40) NOT NULL',
    '"favorite_game" varchar(60)',
    '"bio" varchar(500)',
    'FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade',
  ]) assert.ok(migration.includes(statement));
});

// Make sure the new Drizzle files follow the dev branch migration history.
test('profile migration metadata follows the existing users snapshot', () => {
  assert.equal(snapshot.prevId, baseSnapshot.id);
  assert.deepEqual(snapshot.enums, {});
  assert.equal(journal.entries.length, 2);
  assert.equal(journal.entries[0]?.idx, 0);
  assert.equal(journal.entries[0]?.tag, '0000_initial_users');
  assert.equal(journal.entries[1]?.idx, 1);
  assert.equal(journal.entries[1]?.tag, '0001_open_leader');
});
