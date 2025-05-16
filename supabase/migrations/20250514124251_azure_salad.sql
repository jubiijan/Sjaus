/*
  # Fix game deletion cascade and persistence
  
  1. Changes
    - Add proper cascade deletion for games and related records
    - Ensure proper foreign key constraints
    - Add indexes for better performance
*/

-- Drop existing foreign key constraints
ALTER TABLE game_players
DROP CONSTRAINT IF EXISTS game_players_game_id_fkey,
DROP CONSTRAINT IF EXISTS game_players_user_id_fkey;

ALTER TABLE game_messages
DROP CONSTRAINT IF EXISTS game_messages_game_id_fkey,
DROP CONSTRAINT IF EXISTS game_messages_user_id_fkey;

-- Recreate foreign key constraints with CASCADE
ALTER TABLE game_players
ADD CONSTRAINT game_players_game_id_fkey
  FOREIGN KEY (game_id)
  REFERENCES games(id)
  ON DELETE CASCADE,
ADD CONSTRAINT game_players_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

ALTER TABLE game_messages
ADD CONSTRAINT game_messages_game_id_fkey
  FOREIGN KEY (game_id)
  REFERENCES games(id)
  ON DELETE CASCADE,
ADD CONSTRAINT game_messages_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_user_id ON game_players(user_id);
CREATE INDEX IF NOT EXISTS idx_game_messages_game_id ON game_messages(game_id);
CREATE INDEX IF NOT EXISTS idx_game_messages_user_id ON game_messages(user_id);