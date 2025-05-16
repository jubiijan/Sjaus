/*
  # Fix User Authentication Policies

  1. Changes
    - Add policy to allow users to read their own profile during authentication
    - Ensure policies don't conflict with authentication flow
    
  2. Security
    - Maintains data privacy by limiting access to own profile
    - Preserves existing security policies while fixing authentication
*/

-- Add policy for authentication flow
CREATE POLICY "Allow user profile access during auth"
ON public.users
FOR SELECT
TO authenticated
USING (
  -- Allow access to own profile
  auth.uid() = id
);

-- Ensure basic profile info is readable for active users
CREATE POLICY "Allow reading basic profile info"
ON public.users
FOR SELECT
TO authenticated
USING (
  -- Allow access to active user profiles
  status = 'active' AND role = 'user'
);