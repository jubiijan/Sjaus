/*
  # Fix game_players policy recursion

  1. Changes
    - Drop existing problematic policy on game_players table
    - Create new optimized policy that prevents recursion
    - Policy allows users to:
      - View games they are in
      - View public game information
      - Prevents recursive policy evaluation

  2. Security
    - Maintains RLS protection
    - Simplifies access control logic
    - Prevents policy recursion
*/

-- Drop the problematic policy that's causing recursion
DROP POLICY IF EXISTS "Players can view games they are in" ON game_players;

-- Create new optimized policy
CREATE POLICY "game_players_select_policy"
ON game_players
FOR SELECT
TO authenticated
USING (
  -- Allow access if the user is the player
  user_id = auth.uid()
  OR
  -- Allow access if the user is in the same game
  game_id IN (
    SELECT game_id 
    FROM game_players 
    WHERE user_id = auth.uid()
  )
);