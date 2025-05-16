/*
  # Add created_by column to games table

  1. Changes
    - Add created_by column as nullable initially
    - Update existing records to set created_by to first player
    - Make column non-null after data is populated
    - Add foreign key constraint
    - Add index for performance
*/

-- First add the column as nullable
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS created_by uuid;

-- Update existing records to set created_by to the first player in game_players
UPDATE games
SET created_by = (
  SELECT user_id
  FROM game_players
  WHERE game_players.game_id = games.id
  ORDER BY ctid
  LIMIT 1
)
WHERE created_by IS NULL;

-- Add foreign key constraint
ALTER TABLE games
ADD CONSTRAINT games_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES users(id)
ON DELETE SET NULL;

-- Make the column non-null now that data is populated
ALTER TABLE games
ALTER COLUMN created_by SET NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_games_created_by ON games(created_by);