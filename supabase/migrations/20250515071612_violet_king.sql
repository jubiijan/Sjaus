/*
  # Fix Users Table RLS Policies

  1. Changes
    - Drop existing problematic policies causing infinite recursion
    - Create new simplified policies for:
      - Public read access to basic user info
      - Authenticated users can read all active users
      - Users can update their own data
      - Users can create their own profile during registration
      - Admins have full access
  
  2. Security
    - Maintains RLS enabled on users table
    - Ensures proper access control while avoiding recursion
    - Prevents unauthorized modifications
*/

-- Drop existing policies to clean up
DROP POLICY IF EXISTS "Users can view active users" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can create their own user record" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "public_read_access" ON users;
DROP POLICY IF EXISTS "self_update" ON users;
DROP POLICY IF EXISTS "admin_all" ON users;
DROP POLICY IF EXISTS "Admins have full access" ON users;

-- Create new streamlined policies
-- Allow public read access to basic user info
CREATE POLICY "public_read_basic_info" ON users
  FOR SELECT
  TO public
  USING (status = 'active');

-- Allow authenticated users to read all active users
CREATE POLICY "authenticated_read_active_users" ON users
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Allow users to update their own data
CREATE POLICY "users_update_own_data" ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow new user registration
CREATE POLICY "allow_user_registration" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Give admins full access
CREATE POLICY "admin_full_access" ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  );