/*
  # Fix games table schema
  
  1. Changes
    - Add current_player_id column
    - Add score column as JSONB
    - Update column references
*/

-- First check if current_player column exists and rename it
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'current_player'
  ) THEN
    ALTER TABLE games RENAME COLUMN current_player TO current_player_id;
  END IF;
END $$;

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

-- Add score column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'score'
  ) THEN
    ALTER TABLE games ADD COLUMN score jsonb DEFAULT '{"team1": 24, "team2": 24}';
  END IF;
END $$;