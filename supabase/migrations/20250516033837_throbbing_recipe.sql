/*
  # Add RLS policies for games table

  1. Changes
    - Add INSERT policy to allow authenticated users to create games
    - Add SELECT policy to allow users to view games they are part of or that are in waiting state
    - Add UPDATE policy to allow game creators and players to update games

  2. Security
    - Enable RLS on games table (if not already enabled)
    - Add policies for INSERT, SELECT, and UPDATE operations
*/

-- Enable RLS if not already enabled
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Policy for creating games
CREATE POLICY "Users can create games"
ON games
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Policy for reading games
CREATE POLICY "Users can read games they are part of or that are waiting"
ON games
FOR SELECT
TO authenticated
USING (
  auth.uid() = ANY (players) OR 
  auth.uid() = created_by OR 
  state = 'waiting'
);

-- Policy for updating games
CREATE POLICY "Users can update games they are part of"
ON games
FOR UPDATE
TO authenticated
USING (
  auth.uid() = ANY (players) OR 
  auth.uid() = created_by
)
WITH CHECK (
  auth.uid() = ANY (players) OR 
  auth.uid() = created_by
);