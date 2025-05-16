/*
  # Fix Users Table Authentication Policies

  1. Changes
    - Add policy to allow users to read their own profile during authentication
    - Add policy to allow reading basic user information for game functionality
    
  2. Security
    - Maintains existing RLS policies
    - Adds specific policies for authentication flow
    - Ensures users can only access permitted data
*/

-- Policy to allow users to read their own profile during authentication
CREATE POLICY "Users can read own profile during auth"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy to allow reading basic user information (needed for game functionality)
CREATE POLICY "Allow reading basic user info"
ON public.users
FOR SELECT
TO authenticated
USING (
  (status = 'active' AND role = 'user') OR 
  EXISTS (
    SELECT 1 FROM game_players 
    WHERE game_players.user_id = users.id 
    AND game_players.game_id IN (
      SELECT game_id FROM game_players WHERE user_id = auth.uid()
    )
  )
);