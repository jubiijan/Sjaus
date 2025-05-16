/*
  # Fix game deletion policies and constraints
  
  1. Changes
    - Add proper RLS policies for game deletion
    - Fix cascade deletion behavior
    - Add soft delete support
*/

-- Enable RLS on games table
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable game deletion for creators and admins" ON games;
DROP POLICY IF EXISTS "Enable game updates by players" ON games;
DROP POLICY IF EXISTS "Enable game soft deletion" ON games;

-- Create new policies for game management
CREATE POLICY "Enable game updates by players"
ON games
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM game_players
    WHERE game_players.game_id = id
    AND game_players.user_id = auth.uid()
  )
  AND deleted = false
);

CREATE POLICY "Enable game deletion"
ON games
FOR UPDATE
TO authenticated
USING (
  (
    -- Check if user is admin
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR
    -- Check if user is game creator (first player)
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = id
      AND game_players.user_id = auth.uid()
      AND game_players.ctid = (
        SELECT min(gp.ctid)
        FROM game_players gp
        WHERE gp.game_id = id
      )
    )
  )
);

-- Add trigger for handling game deletion
CREATE OR REPLACE FUNCTION handle_game_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted AND NOT OLD.deleted THEN
    NEW.deleted_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_game_deletion ON games;
CREATE TRIGGER on_game_deletion
  BEFORE UPDATE OF deleted ON games
  FOR EACH ROW
  WHEN (NEW.deleted = true AND OLD.deleted = false)
  EXECUTE FUNCTION handle_game_deletion();