import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(import.meta.dir, "../drizzle/0001_open_leader.sql"),
  "utf8",
);
const snapshot = JSON.parse(readFileSync(
  resolve(import.meta.dir, "../drizzle/meta/0001_snapshot.json"),
  "utf8",
)) as { prevId: string; enums: Record<string, unknown> };
const baseSnapshot = JSON.parse(readFileSync(
  resolve(import.meta.dir, "../drizzle/meta/0000_snapshot.json"),
  "utf8",
)) as { id: string };
const journal = JSON.parse(readFileSync(
  resolve(import.meta.dir, "../drizzle/meta/_journal.json"),
  "utf8",
)) as { entries: Array<{ idx: number; tag: string }> };

test("profile migration enforces one user-owned profile and field storage limits", () => {
  expect(migration).toContain('"user_id" uuid PRIMARY KEY NOT NULL');
  expect(migration).toContain('"display_name" varchar(40) NOT NULL');
  expect(migration).toContain('"favorite_game" varchar(60)');
  expect(migration).toContain('"bio" varchar(500)');
  expect(migration).toContain('FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade');
});

// make sure the new drizzle files follow the dev branch migration history
test("profile migration metadata follows the existing users snapshot", () => {
  expect(snapshot.prevId).toBe(baseSnapshot.id);
  expect(snapshot.enums).toEqual({});
  expect(journal.entries).toHaveLength(2);
  expect(journal.entries[0]?.idx).toBe(0);
  expect(journal.entries[0]?.tag).toBe("0000_initial_users");
  expect(journal.entries[1]?.idx).toBe(1);
  expect(journal.entries[1]?.tag).toBe("0001_open_leader");
});
