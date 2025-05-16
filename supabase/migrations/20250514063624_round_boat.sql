/*
  # Enhanced authentication system

  1. Changes
    - Add login attempt tracking
    - Add account locking mechanism
    - Add email verification status
    - Update RLS policies for better security
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Allow public role access" ON users;
DROP POLICY IF EXISTS "Public can view basic user info" ON users;

-- Add new columns for enhanced security
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS account_locked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS lock_reason text,
ADD COLUMN IF NOT EXISTS lock_expires_at timestamptz;

-- Create function to check if account is locked
CREATE OR REPLACE FUNCTION is_account_locked(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id
    AND (
      account_locked = true
      AND (lock_expires_at IS NULL OR lock_expires_at > now())
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle failed login attempts
CREATE OR REPLACE FUNCTION handle_failed_login()
RETURNS trigger AS $$
BEGIN
  -- Lock account after 5 failed attempts
  IF NEW.failed_login_attempts >= 5 THEN
    NEW.account_locked := true;
    NEW.lock_reason := 'Too many failed login attempts';
    NEW.lock_expires_at := now() + interval '30 minutes';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for failed login attempts
DROP TRIGGER IF EXISTS on_failed_login ON users;
CREATE TRIGGER on_failed_login
  BEFORE UPDATE OF failed_login_attempts ON users
  FOR EACH ROW
  WHEN (NEW.failed_login_attempts > OLD.failed_login_attempts)
  EXECUTE FUNCTION handle_failed_login();

-- Create function to reset failed login attempts
CREATE OR REPLACE FUNCTION reset_failed_login_attempts()
RETURNS trigger AS $$
BEGIN
  NEW.failed_login_attempts := 0;
  NEW.last_failed_login := NULL;
  NEW.account_locked := false;
  NEW.lock_expires_at := NULL;
  NEW.lock_reason := NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for successful login
DROP TRIGGER IF EXISTS on_successful_login ON users;
CREATE TRIGGER on_successful_login
  BEFORE UPDATE OF last_login ON users
  FOR EACH ROW
  WHEN (NEW.last_login IS DISTINCT FROM OLD.last_login)
  EXECUTE FUNCTION reset_failed_login_attempts();

-- Create new policies with proper security
CREATE POLICY "Users can read own data"
ON users
FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Admins can manage all users"
ON users
FOR ALL
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Public can view basic user info"
ON users
FOR SELECT
TO public
USING (true);