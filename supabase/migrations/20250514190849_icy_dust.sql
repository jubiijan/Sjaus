/*
  # Fix game deletion policies

  1. Changes
    - Drop existing policies
    - Add new policies for game deletion and updates
    - Fix policy conditions to avoid OLD/NEW references
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Enable game soft deletion" ON games;
DROP POLICY IF EXISTS "Enable game updates by players" ON games;

-- Create policy for game updates by players (non-deletion updates)
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

-- Create policy for game deletion
CREATE POLICY "Enable game soft deletion"
ON games
FOR UPDATE
TO authenticated
USING (
  (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR 
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
  )
  AND deleted = false
);