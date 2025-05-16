/*
  # Fix user policies and permissions

  1. Changes
    - Drop existing policies
    - Add policy for new user creation
    - Add policy for public email checks
    - Fix admin policy
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow admin all" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Allow public email checks" ON users;

-- Add policy for new user creation
CREATE POLICY "Enable insert for authenticated users"
ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Add policy for public email checks
CREATE POLICY "Allow public read access"
ON users
FOR SELECT
TO public
USING (true);

-- Fix admin policy
CREATE POLICY "Allow admin all operations"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);