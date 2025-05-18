/*
  # Fix game_players RLS policies

  1. Changes
    - Enable RLS on game_players table
    - Drop existing problematic policies
    - Add new simplified policies for:
      - Inserting: Users can only add themselves as players
      - Selecting: Users can view games they are in
      - Updating: Users can only update their own records
      - Deleting: Users can only remove themselves from games

  2. Security
    - All operations require authentication
    - Users can only modify their own records
    - Users can view games they participate in
*/

-- Enable RLS
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Players can view games they are in" ON game_players;
DROP POLICY IF EXISTS "Players can join games" ON game_players;
DROP POLICY IF EXISTS "Players can update their own records" ON game_players;
DROP POLICY IF EXISTS "Players can leave games" ON game_players;

-- Create new simplified policies

-- Allow users to view games they are in
CREATE POLICY "Players can view games they are in"
ON game_players
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 
    FROM game_players gp 
    WHERE gp.game_id = game_players.game_id 
    AND gp.user_id = auth.uid()
  )
);

-- Allow users to join games (insert their own records)
CREATE POLICY "Players can join games"
ON game_players
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow users to update their own records
CREATE POLICY "Players can update their own records"
ON game_players
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow users to leave games (delete their own records)
CREATE POLICY "Players can leave games"
ON game_players
FOR DELETE
TO authenticated
USING (user_id = auth.uid());