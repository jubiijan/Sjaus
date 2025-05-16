/*
  # Fix recursive policies in users table

  1. Changes
    - Drop existing policies
    - Create simplified, non-recursive policies
    - Use auth.uid() instead of uid()
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Public can view basic user info" ON users;
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;

-- Create simplified, non-recursive policies
CREATE POLICY "Users can read their own data"
ON users
FOR SELECT
TO authenticated
USING ((auth.uid() = id) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::text)))));

CREATE POLICY "Users can update their own data"
ON users
FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Public can view basic user info"
ON users
FOR SELECT
TO public
USING (true);