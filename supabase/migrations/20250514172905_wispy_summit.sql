/*
  # Fix RLS policies for users table

  1. Security Changes
    - Enable RLS on users table
    - Add policies for:
      - Public read access to basic user info
      - Authenticated users can update their own data
      - New users can be created during registration
      - Admin users have full access
*/

-- Enable RLS on users table (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable admin access" ON users;
DROP POLICY IF EXISTS "Enable admin role management" ON users;
DROP POLICY IF EXISTS "Enable public read" ON users;
DROP POLICY IF EXISTS "Enable self management" ON users;

-- Policy for public read access to basic user info
CREATE POLICY "Allow public read access"
  ON users
  FOR SELECT
  TO public
  USING (true);

-- Policy for users to update their own data
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy for new user registration
CREATE POLICY "Allow user registration"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy for admin full access
CREATE POLICY "Enable admin full access"
  ON users
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