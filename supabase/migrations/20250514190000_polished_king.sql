/*
  # Fix game deletion policy
  
  1. Changes
    - Drop existing policies
    - Create new policy for game deletion that properly checks admin status and game creator
    - Update policy to use soft delete instead of hard delete
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable game deletion for creators and admins" ON games;
DROP POLICY IF EXISTS "Enable game updates for players" ON games;

-- Create policy for game updates (including soft deletes)
CREATE POLICY "Enable game updates for players"
ON games
FOR UPDATE
TO authenticated
USING (
  (
    -- Allow soft delete for admins and creators
    (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
      ) OR 
      EXISTS (
        SELECT 1 FROM game_players
        WHERE game_players.game_id = games.id
        AND game_players.user_id = auth.uid()
        AND game_players.ctid = (
          SELECT MIN(gp.ctid)
          FROM game_players gp
          WHERE gp.game_id = games.id
        )
      )
    )
  ) OR (
    -- Allow regular updates for players in non-deleted games
    deleted = false AND
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = games.id
      AND game_players.user_id = auth.uid()
    )
  )
);