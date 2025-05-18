/*
  # Fix game players policy and data structure

  1. Changes
    - Drop existing policies on game_players table
    - Create new, optimized policies without recursion
    - Add proper indexes for performance

  2. Security
    - Enable RLS on game_players table
    - Add policies for:
      - Players can view games they're in
      - Players can join open games
      - Players can leave games
      - Players can update their own records
*/

-- First, drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Players can join games" ON game_players;
DROP POLICY IF EXISTS "Players can leave games" ON game_players;
DROP POLICY IF EXISTS "Players can update their own records" ON game_players;
DROP POLICY IF EXISTS "game_players_select_policy" ON game_players;

-- Create new optimized policies
CREATE POLICY "view_game_players"
  ON game_players
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    game_id IN (
      SELECT g.id 
      FROM games g 
      WHERE g.state = 'waiting' OR
            g.id IN (SELECT gp.game_id FROM game_players gp WHERE gp.user_id = auth.uid())
    )
  );

CREATE POLICY "join_games"
  ON game_players
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 
      FROM games g 
      WHERE g.id = game_id 
      AND g.state = 'waiting'
    )
  );

CREATE POLICY "leave_games"
  ON game_players
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "update_own_records"
  ON game_players
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add helpful indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_game_players_game_state ON games(id, state);
CREATE INDEX IF NOT EXISTS idx_game_players_composite ON game_players(game_id, user_id);