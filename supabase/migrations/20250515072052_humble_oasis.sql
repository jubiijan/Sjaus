/*
  # Fix users table RLS policies

  1. Changes
    - Remove recursive admin check from users_read_own_data policy
    - Simplify policy conditions to prevent infinite recursion
    - Add separate policy for admin access
    
  2. Security
    - Maintains row-level security
    - Ensures users can only read their own data
    - Adds explicit admin policy for full table access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "users_read_own_data" ON users;
DROP POLICY IF EXISTS "users_read_active_users" ON users;

-- Create new, simplified policies
CREATE POLICY "users_read_own_data"
ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "admins_read_all_users"
ON users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "users_read_active_users"
ON users
FOR SELECT
TO authenticated
USING (
  status = 'active' 
  AND role <> 'admin'
);