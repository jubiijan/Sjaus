/*
  # Fix game deletion policy

  1. Changes
    - Update RLS policy for game deletion to properly handle both creators and admins
    - Ensure policy checks for game creator using first player in game_players
    - Add admin role check using auth.jwt() claims

  2. Security
    - Maintains RLS enabled on games table
    - Updates policy to be more secure and explicit
*/

DROP POLICY IF EXISTS "Enable game deletion for creators and admins" ON games;

CREATE POLICY "Enable game deletion for creators and admins"
ON games
FOR DELETE
TO authenticated
USING (
  (
    -- Check if user is admin
    (auth.jwt() ->> 'role')::text = 'admin'
  ) OR (
    -- Check if user is the creator (first player)
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
);