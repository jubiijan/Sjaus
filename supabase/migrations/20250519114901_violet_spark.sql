-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE games DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_messages DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Players can view their games" ON game_players;
DROP POLICY IF EXISTS "Players can join games" ON game_players;
DROP POLICY IF EXISTS "Players can leave games" ON game_players;
DROP POLICY IF EXISTS "Players can update their game data" ON game_players;
DROP POLICY IF EXISTS "game_players_select_policy" ON game_players;
DROP POLICY IF EXISTS "Enable game creation" ON games;
DROP POLICY IF EXISTS "Enable game reading" ON games;
DROP POLICY IF EXISTS "Enable game updates" ON games;

-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_user_id ON game_players(user_id);
CREATE INDEX IF NOT EXISTS idx_game_messages_game_id ON game_messages(game_id);
CREATE INDEX IF NOT EXISTS idx_game_messages_user_id ON game_messages(user_id);