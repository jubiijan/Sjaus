-- Add default values and constraints for game_players
ALTER TABLE game_players
  ALTER COLUMN hand SET DEFAULT '[]'::jsonb,
  ALTER COLUMN tricks SET DEFAULT '[]'::jsonb,
  ALTER COLUMN has_left SET DEFAULT false;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable players to join games" ON game_players;
DROP POLICY IF EXISTS "Enable players to update their own data" ON game_players;

-- Create updated policies
CREATE POLICY "Enable players to join games"
ON game_players FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM games
    WHERE games.id = game_id
    AND games.state = 'waiting'::game_state
  )
);

CREATE POLICY "Enable players to update their own data"
ON game_players FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Add unique constraint to prevent duplicate players
ALTER TABLE game_players
DROP CONSTRAINT IF EXISTS unique_player_per_game,
ADD CONSTRAINT unique_player_per_game UNIQUE (game_id, user_id);