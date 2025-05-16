/*
  # Add game deletion policy
  
  1. Changes
    - Add policy to allow game creators and admins to delete games
    - Use array_position to determine first player
*/

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
      SELECT 1 FROM (
        SELECT user_id, 
               row_number() OVER (PARTITION BY game_id ORDER BY ctid) as player_order
        FROM game_players
        WHERE game_id = games.id
      ) ordered_players
      WHERE user_id = auth.uid()
      AND player_order = 1
    )
  );