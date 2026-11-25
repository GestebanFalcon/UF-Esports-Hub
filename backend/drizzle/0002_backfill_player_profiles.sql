-- Initialize missing profiles without replacing any saved profile fields.
-- Count supplementary Unicode characters as two units, matching shared validation.
INSERT INTO "player_profiles" ("user_id", "display_name")
SELECT u."id", COALESCE(NULLIF((
  SELECT string_agg(c.ch, '' ORDER BY c.pos)
  FROM (
    SELECT ch, pos,
      sum(CASE WHEN ascii(ch) > 65535 THEN 2 ELSE 1 END)
        OVER (ORDER BY pos) AS units
    FROM regexp_split_to_table(btrim(u."username"), '')
      WITH ORDINALITY AS characters(ch, pos)
  ) c
  WHERE c.units <= 40
), ''), 'Player') AS "display_name"
FROM "users" u
ON CONFLICT ("user_id") DO NOTHING;
