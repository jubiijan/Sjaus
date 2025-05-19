/*
  # Fix game players schema and policies

  1. Changes
    - Enable RLS on game_players table
    - Add policies for game players table to control access
    - Add index on game_id for better query performance
    
  2. Security
    - Enable RLS on game_players table
    - Add policies for:
      - Players can view games they're in
      - Players can join public games
      - Players can leave games they're in
      - Players can update their own game data
*/

-- Enable RLS on game_players table
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;

-- Create policies for game_players table
CREATE POLICY "Players can view their games"
  ON game_players
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    game_id IN (
      SELECT game_id 
      FROM game_players 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Players can join games"
  ON game_players
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    (
      -- Can join if game exists and is not deleted
      EXISTS (
        SELECT 1 
        FROM games 
        WHERE id = game_id 
        AND deleted = false
      )
    )
  );

CREATE POLICY "Players can leave games"
  ON game_players
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Players can update their game data"
  ON game_players
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_game_players_game_user
  ON game_players(game_id, user_id);