/*
  # Fix game deletion RLS policies

  1. Changes
    - Drop existing update policies
    - Create separate policies for updates and deletion
    - Fix policy conditions to avoid OLD/NEW references
*/

-- Drop existing update policies to recreate them
DROP POLICY IF EXISTS "Enable game deletion by creator or admin" ON games;
DROP POLICY IF EXISTS "Enable game updates by players" ON games;

-- Create new update policy for game updates by players
CREATE POLICY "Enable game updates by players"
ON games
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM game_players 
    WHERE game_players.game_id = games.id 
    AND game_players.user_id = auth.uid()
  )
  AND deleted = false
);

-- Create policy for soft deletion by creator or admin
CREATE POLICY "Enable game deletion by creator or admin"
ON games
FOR UPDATE
TO authenticated
USING (
  (
    -- Check if user is the creator (first player)
    EXISTS (
      SELECT 1
      FROM game_players
      WHERE game_players.game_id = games.id
      AND game_players.user_id = auth.uid()
      AND game_players.ctid = (
        SELECT min(gp.ctid)
        FROM game_players gp
        WHERE gp.game_id = games.id
      )
    )
    -- Or check if user is admin
    OR EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
);