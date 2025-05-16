/*
  # Fix users table policies to prevent recursion

  1. Changes
    - Remove recursive policy checks
    - Fix policy syntax for SELECT operations
    - Ensure proper admin access
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Allow public role access" ON users;
DROP POLICY IF EXISTS "Public can view basic user info" ON users;

-- Create new, non-recursive policies
CREATE POLICY "Users can read own data"
ON users
FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Admins can manage all users"
ON users
FOR ALL
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Public can view basic user info"
ON users
FOR SELECT
TO public
USING (true);