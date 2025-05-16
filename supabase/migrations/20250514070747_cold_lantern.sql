/*
  # Fix recursive policies

  1. Changes
    - Drop existing policies
    - Create new non-recursive policies
    - Simplify policy conditions
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Public can view basic user info" ON users;
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;

-- Create new non-recursive policies
CREATE POLICY "Allow self and admin read"
ON users
FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR
  role = 'admin'
);

CREATE POLICY "Allow self update"
ON users
FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Allow admin all"
ON users
FOR ALL
TO authenticated
USING (role = 'admin');

CREATE POLICY "Allow public read"
ON users
FOR SELECT
TO public
USING (true);