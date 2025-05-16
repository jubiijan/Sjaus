/*
  # Fix game deletion policies
  
  1. Changes
    - Add proper policies for both soft and hard deletion
    - Ensure consistent permission checks
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable game deletion by creator or admin" ON games;
DROP POLICY IF EXISTS "Enable game updates by players" ON games;

-- Policy for regular game updates by players
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

-- Policy for soft deletion (updating deleted flag)
CREATE POLICY "Enable game soft deletion"
ON games
FOR UPDATE
TO authenticated
USING (
  (
    -- Creator check
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
    -- Admin check
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
);

-- Policy for hard deletion
CREATE POLICY "Enable game hard deletion"
ON games
FOR DELETE
TO authenticated
USING (
  (
    -- Creator check
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
    -- Admin check
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
);