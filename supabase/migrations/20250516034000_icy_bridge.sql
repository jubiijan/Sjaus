/*
  # Add game creation policy

  1. Security Changes
    - Add RLS policy to allow authenticated users to create games
    - Policy ensures that the user creating the game is set as the creator
    - This fixes the 401 error when creating new games

  Note: The games table already has RLS enabled, we just need to add the INSERT policy
*/

-- Add policy for game creation
CREATE POLICY "Users can create games"
ON public.games
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);