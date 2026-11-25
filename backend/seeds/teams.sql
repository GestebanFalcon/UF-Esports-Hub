-- Development fixtures only. Apply migrations first. Re-running preserves edits.
-- These accounts have disabled password hashes and receive no global role grants.
BEGIN;

INSERT INTO users (id, username, email, hashed_password) VALUES
  ('70000000-0000-4000-8000-000000000001', 'demo_team_owner', 'team-owner@example.invalid', '!disabled-demo-account'),
  ('70000000-0000-4000-8000-000000000002', 'demo_team_player', 'team-player@example.invalid', '!disabled-demo-account')
ON CONFLICT (id) DO NOTHING;

INSERT INTO player_profiles (user_id, display_name, favorite_game, bio) VALUES
  ('70000000-0000-4000-8000-000000000001', 'Demo manager', NULL, NULL),
  ('70000000-0000-4000-8000-000000000002', 'Demo player', 'Rocket League', NULL)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO teams (id, name, game, description, manager_id) VALUES
  ('71000000-0000-4000-8000-000000000001', 'Demo Gators', 'Rocket League', 'Development Rocket League team.', '70000000-0000-4000-8000-000000000001'),
  ('71000000-0000-4000-8000-000000000002', 'Demo Gators', 'Valorant', '', '70000000-0000-4000-8000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO team_memberships (team_id, player_id) VALUES
  ('71000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002'),
  ('71000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000002')
ON CONFLICT (team_id, player_id) DO NOTHING;

COMMIT;
