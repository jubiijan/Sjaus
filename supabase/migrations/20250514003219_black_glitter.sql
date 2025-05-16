/*
  # Enhanced login security and email handling

  1. Changes
    - Enable case-insensitive email handling with citext
    - Add email format validation
    - Implement login attempt tracking and account locking
    - Update RLS policies for better security
*/

-- Enable citext extension for case-insensitive email handling
CREATE EXTENSION IF NOT EXISTS citext;

-- Modify users table to use citext for email
ALTER TABLE users 
  ALTER COLUMN email TYPE citext,
  ADD CONSTRAINT email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add last_failed_login and failed_login_attempts columns
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS last_failed_login timestamptz,
  ADD COLUMN IF NOT EXISTS failed_login_attempts integer DEFAULT 0;

-- Create function to handle failed login attempts
CREATE OR REPLACE FUNCTION handle_failed_login()
RETURNS trigger AS $$
BEGIN
  NEW.last_failed_login := now();
  IF NEW.failed_login_attempts >= 5 THEN
    NEW.status := 'locked';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for failed login attempts
DROP TRIGGER IF EXISTS on_failed_login ON users;
CREATE TRIGGER on_failed_login
  BEFORE UPDATE OF failed_login_attempts ON users
  FOR EACH ROW
  WHEN (NEW.failed_login_attempts > OLD.failed_login_attempts)
  EXECUTE FUNCTION handle_failed_login();

-- Create function to reset failed login attempts on successful login
CREATE OR REPLACE FUNCTION reset_failed_login_attempts()
RETURNS trigger AS $$
BEGIN
  NEW.failed_login_attempts := 0;
  NEW.last_failed_login := NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for successful login
DROP TRIGGER IF EXISTS on_successful_login ON users;
CREATE TRIGGER on_successful_login
  BEFORE UPDATE OF last_login ON users
  FOR EACH ROW
  WHEN (NEW.last_login IS DISTINCT FROM OLD.last_login)
  EXECUTE FUNCTION reset_failed_login_attempts();

-- Update RLS policies
DROP POLICY IF EXISTS "Users can read their own data" ON users;
CREATE POLICY "Users can read their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can update their own data" ON users;
CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all users" ON users;
CREATE POLICY "Admins can manage all users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
  );