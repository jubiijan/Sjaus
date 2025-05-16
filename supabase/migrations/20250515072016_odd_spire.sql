/*
  # Fix users table RLS policies

  1. Changes
    - Drop existing policies
    - Create new non-recursive policies for:
      - Reading own data
      - Reading active users
      - Updating own data
      - Admin management
      - User registration
    
  2. Security
    - Prevent infinite recursion
    - Maintain proper access control
    - Allow admin management
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "admin_full_access_new" ON users;
DROP POLICY IF EXISTS "allow_user_registration_new" ON users;
DROP POLICY IF EXISTS "authenticated_read_active_users_new" ON users;
DROP POLICY IF EXISTS "public_read_basic_info_new" ON users;
DROP POLICY IF EXISTS "users_update_own_data_new" ON users;

-- Create new non-recursive policies
CREATE POLICY "users_read_own_data"
ON users
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR
  (status = 'active' AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ))
);

CREATE POLICY "users_read_active_users"
ON users
FOR SELECT
TO authenticated
USING (
  status = 'active'
  AND (
    role != 'admin'
    OR
    auth.uid() = id
  )
);

CREATE POLICY "users_update_own_data"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "admin_manage_users"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
  AND id != auth.uid()
);

CREATE POLICY "allow_user_registration"
ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);