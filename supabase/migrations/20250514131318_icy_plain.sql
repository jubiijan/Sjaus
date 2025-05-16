/*
  # Fix Users Table RLS Policies

  1. Changes
    - Add new policy to allow admins to update user roles
    - Ensure admins can manage all user data
  
  2. Security
    - Maintains existing RLS policies
    - Adds specific policy for role management
    - Ensures only admins can modify roles
*/

-- First ensure the policy doesn't already exist to avoid errors
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Enable admin role management'
  ) THEN
    CREATE POLICY "Enable admin role management" 
    ON public.users
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 
        FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 
        FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
      )
    );
  END IF;
END $$;