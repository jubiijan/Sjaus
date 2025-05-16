-- Drop all existing policies
DROP POLICY IF EXISTS "users_read_own_data" ON users;
DROP POLICY IF EXISTS "admins_read_all_users" ON users;
DROP POLICY IF EXISTS "users_read_active_users" ON users;
DROP POLICY IF EXISTS "allow_user_registration" ON users;
DROP POLICY IF EXISTS "users_update_own_data" ON users;
DROP POLICY IF EXISTS "admin_manage_users" ON users;

-- Allow public registration (no auth required)
CREATE POLICY "allow_user_registration"
ON users
FOR INSERT
TO public
WITH CHECK (true);

-- Users can read active users (including admins)
CREATE POLICY "users_read_active_users"
ON users
FOR SELECT
TO authenticated
USING (((status = 'active') AND (role = 'user'::text)) OR (auth.uid() = id));

-- Users can update their own data
CREATE POLICY "users_update_own_data"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admin policies
CREATE POLICY "admin_manage_users"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
  )
  AND id <> auth.uid()
);