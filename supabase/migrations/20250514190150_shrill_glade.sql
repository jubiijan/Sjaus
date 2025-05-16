/*
  # Fix game deletion policies
  
  1. Changes
    - Enable RLS on games table
    - Add policy for regular game updates
    - Add policy for game deletion
    - Fix syntax to avoid using 'new' keyword
*/

-- First, ensure RLS is enabled
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Drop existing update policy to replace it with more specific ones
DROP POLICY IF EXISTS "Enable game updates and deletion" ON games;
DROP POLICY IF EXISTS "Enable game updates by players" ON games;
DROP POLICY IF EXISTS "Enable game deletion by creator or admin" ON games;

-- Create policy for regular game updates by players
CREATE POLICY "Enable game updates by players"
ON games
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM game_players
    WHERE game_players.game_id = games.id
    AND game_players.user_id = auth.uid()
  )
  AND deleted = false
);

-- Create policy for game deletion (only creator or admin)
CREATE POLICY "Enable game deletion by creator or admin"
ON games
FOR UPDATE
TO authenticated
USING (
  (
    -- Check if user is the creator (first player in game_players)
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = games.id
      AND game_players.user_id = auth.uid()
      AND game_players.ctid = (
        SELECT min(gp.ctid)
        FROM game_players gp
        WHERE gp.game_id = games.id
      )
    )
    OR
    -- Check if user is an admin
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
);

-- Update the game deletion trigger to properly handle the deleted flag
CREATE OR REPLACE FUNCTION handle_game_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow deletion by creator or admin
  IF NOT EXISTS (
    SELECT 1 FROM game_players
    WHERE game_players.game_id = NEW.id
    AND game_players.user_id = auth.uid()
    AND game_players.ctid = (
      SELECT min(gp.ctid)
      FROM game_players gp
      WHERE gp.game_id = NEW.id
    )
  ) AND NOT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only the game creator or an admin can delete games';
  END IF;
  
  NEW.deleted_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;