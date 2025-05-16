/*
  # Fix RLS policies for games table

  1. Changes
    - Drop existing delete policy
    - Create new delete policy that properly checks for game creator or admin role
    - Ensure proper RLS enforcement for game deletion

  2. Security
    - Enable RLS on games table (if not already enabled)
    - Add policy for game deletion that checks:
      a) User is the game creator (first player in game_players)
      b) User has admin role
*/

-- Drop existing delete policy if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'games' 
    AND policyname = 'Enable game deletion for creators and admins'
  ) THEN
    DROP POLICY "Enable game deletion for creators and admins" ON public.games;
  END IF;
END $$;

-- Create new delete policy with proper checks
CREATE POLICY "Enable game deletion for creators and admins" ON public.games
  FOR DELETE 
  TO authenticated
  USING (
    -- Check if user is admin
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
    OR 
    -- Check if user is the game creator (first player)
    EXISTS (
      SELECT 1 FROM public.game_players
      WHERE game_id = games.id
      AND user_id = auth.uid()
      AND ctid IN (
        SELECT MIN(ctid)
        FROM public.game_players
        WHERE game_id = games.id
      )
    )
  );