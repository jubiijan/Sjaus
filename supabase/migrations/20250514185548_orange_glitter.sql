/*
  # Fix game deletion policy
  
  1. Changes
    - Drop existing deletion policy
    - Create new policy using row_number() to identify game creator
    - Allow both admins and game creators to delete games
*/

-- Drop the existing delete policy if it exists
DROP POLICY IF EXISTS "Enable game deletion for creators and admins" ON games;

-- Create new policy that properly checks for creator (first player) or admin status
CREATE POLICY "Enable game deletion for creators and admins"
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
  -- Check if user is game creator (first player)
  EXISTS (
    SELECT 1
    FROM (
      SELECT game_players.user_id,
             row_number() OVER (PARTITION BY game_players.game_id ORDER BY game_players.ctid) as player_order
      FROM game_players
      WHERE game_players.game_id = games.id
    ) ordered_players
    WHERE ordered_players.user_id = auth.uid()
    AND ordered_players.player_order = 1
  )
);