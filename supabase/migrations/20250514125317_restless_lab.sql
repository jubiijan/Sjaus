/*
  # Clean up all games and related data
  
  1. Changes
    - Remove all existing games
    - Remove related game_players records
    - Remove related game_messages records
    - Reset sequences if any
*/

-- Delete all game-related data
DELETE FROM game_messages;
DELETE FROM game_players;
DELETE FROM games;

-- Clean up any orphaned records
DELETE FROM game_players WHERE game_id NOT IN (SELECT id FROM games);
DELETE FROM game_messages WHERE game_id NOT IN (SELECT id FROM games);