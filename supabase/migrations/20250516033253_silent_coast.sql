/*
  # Add created_by column to games table

  1. Changes
    - Add `created_by` column to `games` table
      - Type: uuid (to match user IDs)
      - Not nullable
      - References users(id)
      - On delete set null to prevent orphaned games
    
  2. Security
    - No RLS changes needed as the table already has policies
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE games 
    ADD COLUMN created_by uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_games_created_by ON games(created_by);