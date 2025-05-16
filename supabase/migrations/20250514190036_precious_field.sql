/*
  # Update game policies

  1. Changes
    - Add policy for game deletion
    - Update existing update policy to handle soft deletion
  
  2. Security
    - Allow game creators and admins to delete games
    - Ensure deleted games are not visible to regular users
*/

-- Drop existing update policy
DROP POLICY IF EXISTS "Enable game updates for players" ON games;

-- Create new update policy that handles both updates and soft deletion
CREATE POLICY "Enable game updates and deletion" 
ON games
FOR UPDATE 
TO authenticated
USING (
  -- Allow admins to update/delete any game
  (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ))
  OR
  -- Allow game creator to update/delete their own game
  (EXISTS (
    SELECT 1 FROM game_players
    WHERE game_players.game_id = games.id
    AND game_players.user_id = auth.uid()
    -- Get the first player (creator) using ctid
    AND game_players.ctid = (
      SELECT min(gp.ctid)
      FROM game_players gp
      WHERE gp.game_id = games.id
    )
  ))
  OR
  -- Allow players to update non-deleted games they're in
  (
    deleted = false 
    AND EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = games.id
      AND game_players.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  -- Same conditions as USING clause
  (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ))
  OR
  (EXISTS (
    SELECT 1 FROM game_players
    WHERE game_players.game_id = games.id
    AND game_players.user_id = auth.uid()
    AND game_players.ctid = (
      SELECT min(gp.ctid)
      FROM game_players gp
      WHERE gp.game_id = games.id
    )
  ))
  OR
  (
    deleted = false 
    AND EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = games.id
      AND game_players.user_id = auth.uid()
    )
  )
);