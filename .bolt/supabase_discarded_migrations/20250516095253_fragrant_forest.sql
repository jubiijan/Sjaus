/*
  # Fix games table schema

  1. Changes
    - Rename current_player to current_player_id for consistency
    - Add missing columns
    - Fix column types and constraints
*/

-- Rename current_player to current_player_id
ALTER TABLE games 
RENAME COLUMN IF EXISTS current_player TO current_player_id;

-- Add current_player_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'current_player_id'
  ) THEN
    ALTER TABLE games ADD COLUMN current_player_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add score columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'score'
  ) THEN
    ALTER TABLE games ADD COLUMN score jsonb DEFAULT '{"team1": 24, "team2": 24}';
  END IF;
END $$;