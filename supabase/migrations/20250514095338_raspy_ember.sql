/*
  # Add admin permissions for user management
  
  1. Changes
    - Add policies for admin user management
    - Ensure admins can delete users
*/

-- Drop existing admin policies
DROP POLICY IF EXISTS "Allow admin all" ON users;

-- Create admin policies
CREATE POLICY "Allow admin all"
ON users
FOR ALL
TO authenticated
USING (role = 'admin');

-- Ensure cascade delete for user data
ALTER TABLE game_players
DROP CONSTRAINT IF EXISTS game_players_user_id_fkey,
ADD CONSTRAINT game_players_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES users(id) 
  ON DELETE CASCADE;

ALTER TABLE game_messages
DROP CONSTRAINT IF EXISTS game_messages_user_id_fkey,
ADD CONSTRAINT game_messages_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES users(id) 
  ON DELETE CASCADE;