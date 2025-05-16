/*
  # Add game creation policy

  1. Security Changes
    - Add RLS policy to allow authenticated users to create new games
    - Policy ensures only authenticated users can create games
    - Games are created with proper initial state

  2. Changes
    - Add INSERT policy for games table
*/

CREATE POLICY "Enable game creation for authenticated users"
ON public.games
FOR INSERT
TO authenticated
WITH CHECK (
  -- Ensure game starts in waiting state
  state = 'waiting' AND
  -- Ensure initial scores are set to default values
  score_team1 = 24 AND 
  score_team2 = 24 AND
  -- Ensure game is not marked as deleted on creation
  deleted = false
);