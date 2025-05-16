/*
  # Fix game joining functionality

  1. Changes
    - Add missing RLS policies for game joining
    - Update existing policies to handle game state changes
    - Fix policy conditions for player updates
*/

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can create games" ON games;
DROP POLICY IF EXISTS "Users can read games they are part of" ON games;
DROP POLICY IF EXISTS "Users can read games they are part of or that are waiting" ON games;
DROP POLICY IF EXISTS "Users can update games they are part of" ON games;
DROP POLICY IF EXISTS "Users can update players in their games" ON games;

-- Create comprehensive set of policies
CREATE POLICY "Enable game creation"
ON games
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Enable game reading"
ON games
FOR SELECT
TO authenticated
USING (
  auth.uid() = ANY (players) OR 
  auth.uid() = created_by OR 
  state = 'waiting'
);

CREATE POLICY "Enable game updates"
ON games
FOR UPDATE
TO authenticated
USING (
  -- Allow updates if user is creator or player
  (auth.uid() = created_by OR auth.uid() = ANY (players))
  AND
  -- For state changes, only allow if user is creator
  (
    (OLD.state = NEW.state) OR 
    auth.uid() = created_by
  )
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_games_players ON games USING GIN (players);