/*
  # Fix users table RLS policies for registration
  
  1. Changes
    - Add policy for new user creation
    - Fix public read access
    - Update admin policies
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "public_read_access" ON users;
DROP POLICY IF EXISTS "self_insert" ON users;
DROP POLICY IF EXISTS "self_update" ON users;
DROP POLICY IF EXISTS "admin_all" ON users;

-- Create new policies
CREATE POLICY "public_read_access"
ON users
FOR SELECT
TO public
USING (true);

CREATE POLICY "allow_user_registration"
ON users
FOR INSERT
TO public
WITH CHECK (true);

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