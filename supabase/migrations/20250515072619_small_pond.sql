-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE games DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_messages DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "users_read_own_data" ON users;
DROP POLICY IF EXISTS "admins_read_all_users" ON users;
DROP POLICY IF EXISTS "users_read_active_users" ON users;
DROP POLICY IF EXISTS "allow_user_registration" ON users;
DROP POLICY IF EXISTS "users_update_own_data" ON users;
DROP POLICY IF EXISTS "admin_manage_users" ON users;
DROP POLICY IF EXISTS "Allow user profile access during auth" ON users;
DROP POLICY IF EXISTS "Allow reading basic profile info" ON users;
DROP POLICY IF EXISTS "Users can read own profile during auth" ON users;
DROP POLICY IF EXISTS "Allow reading basic user info" ON users;

-- Drop game-related policies
DROP POLICY IF EXISTS "Enable read access for all users" ON games;
DROP POLICY IF EXISTS "Enable game creation for authenticated users" ON games;
DROP POLICY IF EXISTS "Enable game updates for players" ON games;
DROP POLICY IF EXISTS "Enable game deletion for creators and admins" ON games;
DROP POLICY IF EXISTS "Enable game soft deletion" ON games;
DROP POLICY IF EXISTS "Enable game hard deletion" ON games;

-- Drop game players policies
DROP POLICY IF EXISTS "Enable read access for all users" ON game_players;
DROP POLICY IF EXISTS "Enable players to join games" ON game_players;
DROP POLICY IF EXISTS "Enable players to update their own data" ON game_players;

-- Drop game messages policies
DROP POLICY IF EXISTS "Anyone can read game messages" ON game_messages;
DROP POLICY IF EXISTS "Players can create messages in their games" ON game_messages;