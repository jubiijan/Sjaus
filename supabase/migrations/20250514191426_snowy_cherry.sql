/*
  # Add delete policy for games table

  1. Changes
    - Add RLS policy to allow game creators and admins to delete games
    
  2. Security
    - Only game creators (first player to join) and admins can delete games
    - Uses game_players table to determine game creator
*/

CREATE POLICY "Enable game deletion for creators and admins"
ON games
FOR DELETE
TO authenticated
USING (
  (
    -- Check if user is admin
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  ) OR (
    -- Check if user is game creator (first player to join)
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
);