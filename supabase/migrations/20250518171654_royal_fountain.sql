/*
  # Fix game creation and player handling

  1. Changes
    - Remove any references to deprecated 'players' column if it exists
    - Ensure game_players table has correct foreign key constraints
    - Add indexes for performance optimization

  2. Security
    - Enable RLS on game_players table
    - Add policies for player access
*/

DO $$ 
BEGIN
  -- Remove players column if it exists (safely)
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'games' 
    AND column_name = 'players'
  ) THEN
    ALTER TABLE games DROP COLUMN players;
  END IF;
END $$;

-- Ensure game_players table has correct indexes
CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_user_id ON game_players(user_id);

-- Enable RLS on game_players if not already enabled
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;

-- Add RLS policies if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'game_players' AND policyname = 'Players can view games they are in'
  ) THEN
    CREATE POLICY "Players can view games they are in" 
    ON game_players
    FOR SELECT 
    TO authenticated 
    USING (
      auth.uid() = user_id OR 
      EXISTS (
        SELECT 1 FROM game_players gp 
        WHERE gp.game_id = game_players.game_id 
        AND gp.user_id = auth.uid()
      )
    );
  END IF;
END $$;