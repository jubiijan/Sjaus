-- Drop existing RLS policies
DROP POLICY IF EXISTS "Enable game creation" ON games;
DROP POLICY IF EXISTS "Enable game reading" ON games;
DROP POLICY IF EXISTS "Enable game updates" ON games;
DROP POLICY IF EXISTS "Enable player joining" ON game_players;
DROP POLICY IF EXISTS "Enable player reading" ON game_players;
DROP POLICY IF EXISTS "Enable player updates" ON game_players;
DROP POLICY IF EXISTS "Enable message creation" ON game_messages;
DROP POLICY IF EXISTS "Enable message reading" ON game_messages;

-- Disable RLS on all game-related tables
ALTER TABLE games DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_messages DISABLE ROW LEVEL SECURITY;