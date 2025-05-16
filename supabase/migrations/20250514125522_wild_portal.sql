/*
  # Fix user deletion cascade

  1. Changes
    - Ensure proper cascade deletion for user-related records
    - Add missing foreign key constraints
    - Clean up any orphaned records
*/

-- Drop existing foreign key constraints
ALTER TABLE game_players
DROP CONSTRAINT IF EXISTS game_players_user_id_fkey;

ALTER TABLE game_messages
DROP CONSTRAINT IF EXISTS game_messages_user_id_fkey;

ALTER TABLE games
DROP CONSTRAINT IF EXISTS games_current_player_fkey,
DROP CONSTRAINT IF EXISTS games_trump_declarer_fkey;

-- Recreate foreign key constraints with CASCADE
ALTER TABLE game_players
ADD CONSTRAINT game_players_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

ALTER TABLE game_messages
ADD CONSTRAINT game_messages_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

ALTER TABLE games
ADD CONSTRAINT games_current_player_fkey
  FOREIGN KEY (current_player)
  REFERENCES users(id)
  ON DELETE SET NULL,
ADD CONSTRAINT games_trump_declarer_fkey
  FOREIGN KEY (trump_declarer)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Clean up any orphaned records
DELETE FROM game_players WHERE user_id NOT IN (SELECT id FROM users);
DELETE FROM game_messages WHERE user_id NOT IN (SELECT id FROM users);
UPDATE games SET current_player = NULL WHERE current_player NOT IN (SELECT id FROM users);
UPDATE games SET trump_declarer = NULL WHERE trump_declarer NOT IN (SELECT id FROM users);