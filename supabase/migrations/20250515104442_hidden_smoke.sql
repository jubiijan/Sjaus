/*
  # Fix RLS issues by explicitly disabling RLS and cleaning up policies
  
  1. Changes
    - Explicitly disable RLS on all tables
    - Drop any remaining policies
    - Clean up any RLS-related functions and triggers
*/

-- Explicitly disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE games DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_messages DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies (if any remain)
DROP POLICY IF EXISTS "users_read_own_data" ON users;
DROP POLICY IF EXISTS "users_read_active_users" ON users;
DROP POLICY IF EXISTS "allow_user_registration" ON users;
DROP POLICY IF EXISTS "users_update_own_data" ON users;
DROP POLICY IF EXISTS "admin_manage_users" ON users;
DROP POLICY IF EXISTS "Users can read own profile during auth" ON users;
DROP POLICY IF EXISTS "Allow reading basic user info" ON users;
DROP POLICY IF EXISTS "Allow user profile access during auth" ON users;
DROP POLICY IF EXISTS "Allow reading basic profile info" ON users;

DROP POLICY IF EXISTS "Enable game updates by players" ON games;
DROP POLICY IF EXISTS "Enable game deletion" ON games;
DROP POLICY IF EXISTS "Enable game creation for authenticated users" ON games;
DROP POLICY IF EXISTS "Enable game updates for players" ON games;
DROP POLICY IF EXISTS "Enable game deletion for creators and admins" ON games;

DROP POLICY IF EXISTS "Enable read access for all users" ON game_players;
DROP POLICY IF EXISTS "Enable players to join games" ON game_players;
DROP POLICY IF EXISTS "Enable players to update their own data" ON game_players;

DROP POLICY IF EXISTS "Anyone can read game messages" ON game_messages;
DROP POLICY IF EXISTS "Players can create messages in their games" ON game_messages;

-- Drop any remaining RLS-related functions and triggers
DROP TRIGGER IF EXISTS on_game_deletion ON games;
DROP FUNCTION IF EXISTS handle_game_deletion();
DROP TRIGGER IF EXISTS validate_role_change_trigger ON users;
DROP TRIGGER IF EXISTS sync_user_role_trigger ON users;
DROP FUNCTION IF EXISTS validate_role_change();
DROP FUNCTION IF EXISTS sync_user_role();

-- Verify RLS is disabled
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('users', 'games', 'game_players', 'game_messages')
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS is still enabled on some tables';
  END IF;
END $$;