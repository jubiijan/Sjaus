/*
  # Fix recursive policies on users table

  1. Changes
    - Remove recursive admin policy that was causing infinite recursion
    - Simplify and consolidate user policies
    - Ensure proper access control without circular dependencies
  
  2. Security
    - Maintain row-level security
    - Ensure users can only access appropriate data
    - Prevent unauthorized access while avoiding recursion
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Allow admin all operations" ON users;
DROP POLICY IF EXISTS "Allow public read" ON users;
DROP POLICY IF EXISTS "Allow public read access" ON users;
DROP POLICY IF EXISTS "Allow self and admin read" ON users;
DROP POLICY IF EXISTS "Allow self update" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;

-- Create new, simplified policies without recursion
CREATE POLICY "Enable read access for all users"
ON users FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable self insert for authenticated users"
ON users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable self update for users"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Add admin policies without recursion
CREATE POLICY "Enable admin all operations"
ON users FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'admin'
);