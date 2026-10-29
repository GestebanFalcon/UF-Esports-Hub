import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(import.meta.dir, "../drizzle/0002_lethal_obadiah_stane.sql"),
  "utf8",
);

test("profile migration enforces one user-owned profile and field storage limits", () => {
  expect(migration).toContain('"user_id" uuid PRIMARY KEY NOT NULL');
  expect(migration).toContain('"display_name" varchar(40) NOT NULL');
  expect(migration).toContain('"favorite_game" varchar(60)');
  expect(migration).toContain('"bio" varchar(500)');
  expect(migration).toContain('FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade');
});
