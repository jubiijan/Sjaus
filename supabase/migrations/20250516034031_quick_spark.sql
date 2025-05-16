/*
  # Add game creation policy if it doesn't exist
  
  1. Changes
    - Add policy for game creation if not already present
    - Check existence before creating to avoid errors
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'games' 
    AND policyname = 'Users can create games'
  ) THEN
    CREATE POLICY "Users can create games"
    ON public.games
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);
  END IF;
END $$;