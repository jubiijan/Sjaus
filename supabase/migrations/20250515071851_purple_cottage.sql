/*
  # Fix users table RLS policies

  1. Changes
    - Drop existing policies
    - Create new non-recursive policies
    - Fix user registration and access control
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "public_read_access" ON users;
DROP POLICY IF EXISTS "self_insert" ON users;
DROP POLICY IF EXISTS "self_update" ON users;
DROP POLICY IF EXISTS "admin_all" ON users;
DROP POLICY IF EXISTS "allow_user_registration" ON users;
DROP POLICY IF EXISTS "Users can create their own user record" ON users;
DROP POLICY IF EXISTS "Users can view active users" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Admins have full access" ON users;
DROP POLICY IF EXISTS "Enable admin access" ON users;
DROP POLICY IF EXISTS "Enable public read" ON users;
DROP POLICY IF EXISTS "Enable self management" ON users;
DROP POLICY IF EXISTS "Enable admin all" ON users;
DROP POLICY IF EXISTS "authenticated_read_active_users" ON users;
DROP POLICY IF EXISTS "public_read_basic_info" ON users;
DROP POLICY IF EXISTS "allow_user_registration" ON users;
DROP POLICY IF EXISTS "users_update_own_data" ON users;
DROP POLICY IF EXISTS "admin_full_access" ON users;

-- Create new non-recursive policies
CREATE POLICY "authenticated_read_active_users_new"
ON users
FOR SELECT
TO authenticated
USING (status = 'active');

CREATE POLICY "public_read_basic_info_new"
ON users
FOR SELECT
TO public
USING (status = 'active');

CREATE POLICY "allow_user_registration_new"
ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own_data_new"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "admin_full_access_new"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'
    AND u.id <> users.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'
    AND u.id <> users.id
  )
);