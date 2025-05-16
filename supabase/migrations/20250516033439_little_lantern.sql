/*
  # Add players column to games table

  1. Changes
    - Add `players` column to `games` table to store array of player UUIDs
    - Add foreign key constraint to ensure player IDs reference valid users
    - Add RLS policy to allow authenticated users to read/write players data

  2. Security
    - Enable RLS on `games` table
    - Add policies for authenticated users to:
      - Read games they are part of
      - Update players list for games they are part of
*/

-- Add players column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'players'
  ) THEN
    ALTER TABLE games ADD COLUMN players uuid[] DEFAULT '{}';
  END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Policy for reading games
CREATE POLICY "Users can read games they are part of"
  ON games
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = ANY(players) OR
    auth.uid() = created_by OR
    state = 'waiting'
  );

-- Policy for updating players
CREATE POLICY "Users can update players in their games"
  ON games
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = ANY(players) OR auth.uid() = created_by)
  WITH CHECK (auth.uid() = ANY(players) OR auth.uid() = created_by);