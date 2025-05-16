/*
  # Fix users table policies

  1. Changes
    - Remove recursive policy conditions that cause infinite loops
    - Simplify admin access policy
    - Update self-update policy to be more specific
    - Maintain security while preventing recursion

  2. Security
    - Maintain RLS enabled on users table
    - Keep basic access controls intact
    - Ensure admins retain full access
    - Allow users to manage their own data
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Enable admin all operations" ON users;
DROP POLICY IF EXISTS "Enable admin role updates" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable self insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable self update for users" ON users;

-- Recreate policies without recursive conditions
CREATE POLICY "Enable admin access"
ON users
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'admin'
);

CREATE POLICY "Enable public read access"
ON users
FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable self insert"
ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable self update"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);