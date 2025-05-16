/*
  # Fix user policies and permissions

  1. Changes
    - Drop existing policies
    - Create new policies with proper permissions
    - Fix admin access and public registration
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "public_read_access" ON users;
DROP POLICY IF EXISTS "self_insert" ON users;
DROP POLICY IF EXISTS "self_update" ON users;
DROP POLICY IF EXISTS "admin_all" ON users;
DROP POLICY IF EXISTS "allow_user_registration" ON users;

-- Create new policies with proper permissions
CREATE POLICY "public_read_access"
ON users
FOR SELECT
TO public
USING (true);

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
   FROM auth.users users_1
  WHERE ((users_1.id = auth.uid()) AND ((users_1.raw_user_meta_data ->> 'role'::text) = 'admin'::text))))
WITH CHECK (EXISTS ( SELECT 1
   FROM auth.users users_1
  WHERE ((users_1.id = auth.uid()) AND ((users_1.raw_user_meta_data ->> 'role'::text) = 'admin'::text))));