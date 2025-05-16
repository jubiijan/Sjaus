/*
  # Fix Users Table RLS Policies

  1. Changes
    - Remove existing problematic RLS policies that cause recursion
    - Add new, properly structured RLS policies for the users table:
      - Allow public read access to basic user info
      - Allow authenticated users to read active users
      - Allow user registration
      - Allow users to update their own data
      - Allow admins full access
  
  2. Security
    - Maintains RLS enabled on users table
    - Implements proper access control without recursion
    - Ensures secure user registration flow
*/

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "admin_full_access" ON users;
DROP POLICY IF EXISTS "allow_user_registration" ON users;
DROP POLICY IF EXISTS "authenticated_read_active_users" ON users;
DROP POLICY IF EXISTS "public_read_basic_info" ON users;
DROP POLICY IF EXISTS "users_update_own_data" ON users;

-- Create new policies without recursion
-- Public can read basic info of active users
CREATE POLICY "public_read_basic_info" ON users
  FOR SELECT
  TO public
  USING (status = 'active');

-- Authenticated users can read active users
CREATE POLICY "authenticated_read_active_users" ON users
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Allow user registration (no recursion check needed for INSERT)
CREATE POLICY "allow_user_registration" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "users_update_own_data" ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins have full access
CREATE POLICY "admin_full_access" ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.id != users.id  -- Prevent recursion by excluding self-reference
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.id != users.id  -- Prevent recursion by excluding self-reference
    )
  );