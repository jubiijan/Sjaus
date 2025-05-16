/*
  # Fix game deletion policies

  1. Changes
    - Drop existing deletion policies
    - Add policy for soft deletion (updating deleted flag)
    - Add policy for hard deletion
    - Fix RLS checks for creator and admin access
*/

-- Drop existing deletion policies if they exist
DROP POLICY IF EXISTS "Enable game soft deletion" ON games;
DROP POLICY IF EXISTS "Enable game hard deletion" ON games;

-- Create new policy for soft deletion (updating deleted flag)
CREATE POLICY "Enable game soft deletion"
ON games
FOR UPDATE
TO authenticated
USING (
  -- Check if user is admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
  OR
  -- Check if user is the game creator (first player)
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
);

-- Create new policy for hard deletion
CREATE POLICY "Enable game hard deletion"
ON games
FOR DELETE
TO authenticated
USING (
  -- Check if user is admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
  OR
  -- Check if user is the game creator (first player)
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
);