/*
  # Fix user policies and permissions

  1. Changes
    - Drop existing policies to avoid conflicts
    - Add email format validation
    - Create clean set of policies for users table
    - Fix admin access permissions
*/

-- Drop all existing policies on users
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Allow admin all" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Allow public read access" ON users;
DROP POLICY IF EXISTS "Allow admin all operations" ON users;
DROP POLICY IF EXISTS "Allow public role access" ON users;
DROP POLICY IF EXISTS "Public can view basic user info" ON users;

-- Add email format validation
ALTER TABLE users 
  DROP CONSTRAINT IF EXISTS email_format,
  ADD CONSTRAINT email_format 
    CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Create clean set of policies
CREATE POLICY "Users can read their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Allow admin all operations"
  ON users
  FOR ALL
  TO authenticated
  USING (EXISTS ( 
    SELECT 1
    FROM users users_1
    WHERE ((users_1.id = auth.uid()) AND (users_1.role = 'admin'::text))
  ));

CREATE POLICY "Enable insert for authenticated users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow public read access"
  ON users
  FOR SELECT
  TO public
  USING (true);