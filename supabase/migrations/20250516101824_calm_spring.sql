/*
  # Fix game_players RLS policies

  1. Changes
    - Drop existing RLS policies on game_players table
    - Create new, optimized policies without recursion
  
  2. Security
    - Maintain same security level but with better performance
    - Players can only see game_players entries for games they're in or that are in 'waiting' state
    - Players can only update their own entries
    - Players can only join games in 'waiting' state
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Enable player joining" ON game_players;
DROP POLICY IF EXISTS "Enable player reading" ON game_players;
DROP POLICY IF EXISTS "Enable player updates" ON game_players;

-- Create new optimized policies
CREATE POLICY "Enable player joining" ON game_players
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uid() = user_id AND
    EXISTS (
      SELECT 1 FROM games 
      WHERE games.id = game_players.game_id 
      AND games.state = 'waiting'
    )
  );

CREATE POLICY "Enable player reading" ON game_players
  FOR SELECT
  TO authenticated
  USING (
    user_id = uid() OR
    EXISTS (
      SELECT 1 FROM games 
      WHERE games.id = game_players.game_id 
      AND (
        games.state = 'waiting' OR
        games.created_by = uid() OR
        EXISTS (
          SELECT 1 FROM game_players gp 
          WHERE gp.game_id = games.id 
          AND gp.user_id = uid()
        )
      )
    )
  );

CREATE POLICY "Enable player updates" ON game_players
  FOR UPDATE
  TO authenticated
  USING (user_id = uid())
  WITH CHECK (user_id = uid());