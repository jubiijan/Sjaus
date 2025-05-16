/*
  # Fix game deletion persistence

  1. Changes
    - Add deleted_at column to games table
    - Add deleted flag to games table
    - Update queries to exclude deleted games
    - Add cascade deletion triggers
*/

-- Add columns for soft deletion
ALTER TABLE games
ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Create function to handle game deletion
CREATE OR REPLACE FUNCTION handle_game_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Set the deleted flag and timestamp
  NEW.deleted := true;
  NEW.deleted_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for game deletion
DROP TRIGGER IF EXISTS on_game_deletion ON games;
CREATE TRIGGER on_game_deletion
  BEFORE UPDATE OF deleted ON games
  FOR EACH ROW
  WHEN (NEW.deleted = true AND OLD.deleted = false)
  EXECUTE FUNCTION handle_game_deletion();

-- Update existing policies to exclude deleted games
DROP POLICY IF EXISTS "Enable read access for all users" ON games;
CREATE POLICY "Enable read access for all users"
ON games FOR SELECT
TO authenticated
USING (deleted = false);

DROP POLICY IF EXISTS "Enable game creation for authenticated users" ON games;
CREATE POLICY "Enable game creation for authenticated users"
ON games FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable game updates for players" ON games;
CREATE POLICY "Enable game updates for players"
ON games FOR UPDATE
TO authenticated
USING (
  deleted = false AND
  EXISTS (
    SELECT 1 FROM game_players
    WHERE game_players.game_id = id
    AND game_players.user_id = auth.uid()
  )
);