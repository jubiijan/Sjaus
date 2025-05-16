-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE games DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_messages DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable game creation" ON games;
DROP POLICY IF EXISTS "Enable game reading" ON games;
DROP POLICY IF EXISTS "Enable game updates" ON games;
DROP POLICY IF EXISTS "Users can create games" ON games;
DROP POLICY IF EXISTS "Users can read games they are part of" ON games;
DROP POLICY IF EXISTS "Users can read games they are part of or that are waiting" ON games;
DROP POLICY IF EXISTS "Users can update games they are part of" ON games;
DROP POLICY IF EXISTS "Users can update players in their games" ON games;

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