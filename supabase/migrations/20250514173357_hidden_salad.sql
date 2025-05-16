/*
  # Fix recursive policies in users table

  1. Changes
    - Drop existing policies
    - Create new non-recursive policies
    - Use auth.users metadata for admin checks
    - Maintain proper security while preventing recursion
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable admin access" ON users;
DROP POLICY IF EXISTS "Enable admin role management" ON users;
DROP POLICY IF EXISTS "Enable public read" ON users;
DROP POLICY IF EXISTS "Enable self management" ON users;
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Allow public role access" ON users;
DROP POLICY IF EXISTS "Public can view basic user info" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Enable admin full access" ON users;
DROP POLICY IF EXISTS "Users can read basic public profile data" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;

-- Create new non-recursive policies
CREATE POLICY "public_read_access"
ON users
FOR SELECT
TO public
USING (true);

CREATE POLICY "self_insert"
ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "self_update"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "admin_all"
ON users
FOR ALL
TO authenticated
USING (EXISTS ( SELECT 1
   FROM auth.users
   WHERE auth.users.id = auth.uid()
   AND auth.users.raw_user_meta_data->>'role' = 'admin'))
WITH CHECK (EXISTS ( SELECT 1
   FROM auth.users
   WHERE auth.users.id = auth.uid()
   AND auth.users.raw_user_meta_data->>'role' = 'admin'));