/*
  # Add missing columns to games table

  1. Changes
    - Add current_trick column for tracking active trick
    - Add tricks column for completed tricks
    - Add deck column for remaining cards
    - Add table_cards column for cards in play
*/

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add current_trick column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'current_trick'
  ) THEN
    ALTER TABLE games ADD COLUMN current_trick JSONB[] DEFAULT '{}';
  END IF;

  -- Add tricks column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'tricks'
  ) THEN
    ALTER TABLE games ADD COLUMN tricks JSONB[] DEFAULT '{}';
  END IF;

  -- Add deck column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'deck'
  ) THEN
    ALTER TABLE games ADD COLUMN deck JSONB[] DEFAULT '{}';
  END IF;

  -- Add table_cards column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'table_cards'
  ) THEN
    ALTER TABLE games ADD COLUMN table_cards JSONB[] DEFAULT '{}';
  END IF;
END $$;