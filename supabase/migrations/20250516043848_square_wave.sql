/*
  # Update game policies and indexing

  1. Changes
    - Remove existing game policies
    - Add new comprehensive policies for game access control
    - Add GIN index for players array
  
  2. Security
    - Enable game creation for authenticated users
    - Allow reading games if user is player, creator, or game is in waiting state
    - Restrict game updates based on user role and state changes
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

-- Create a function to handle game updates
CREATE OR REPLACE FUNCTION check_game_update_allowed()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user is creator or player
  IF NOT (auth.uid() = NEW.created_by OR auth.uid() = ANY (NEW.players)) THEN
    RETURN NULL;
  END IF;

  -- For state changes, only allow if user is creator
  IF OLD.state != NEW.state AND auth.uid() != NEW.created_by THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS check_game_update ON games;
CREATE TRIGGER check_game_update
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION check_game_update_allowed();

-- Create the update policy
CREATE POLICY "Enable game updates"
ON games
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by OR auth.uid() = ANY (players));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_games_players ON games USING GIN (players);