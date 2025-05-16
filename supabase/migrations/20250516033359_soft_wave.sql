/*
  # Add messages column to games table

  1. Changes
    - Add `messages` column to `games` table to store game messages
      - Type: JSONB array to store message objects
      - Nullable: Yes (games can exist without messages)
      - Default: Empty array

  2. Security
    - No additional RLS policies needed as the games table already has RLS policies
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'messages'
  ) THEN
    ALTER TABLE games ADD COLUMN messages JSONB[] DEFAULT '{}';
  END IF;
END $$;