/*
  # Fix admin role update policy

  1. Changes
    - Drop existing policies that may conflict
    - Create new policy specifically for role updates
    - Add proper checks for admin permissions
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable admin all operations" ON users;
DROP POLICY IF EXISTS "Enable admin role updates" ON users;

-- Create base admin policy
CREATE POLICY "Enable admin all operations" ON users
FOR ALL 
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- Create specific policy for role updates
CREATE POLICY "Enable admin role updates" ON users
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin' -- Verify admin status
  AND id != auth.uid() -- Prevent self-role modification
)
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin' -- Verify admin status
  AND id != auth.uid() -- Prevent self-role modification
);

-- Create function to validate role changes
CREATE OR REPLACE FUNCTION validate_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent users from modifying their own role
  IF auth.uid() = OLD.id AND NEW.role != OLD.role THEN
    RAISE EXCEPTION 'Users cannot modify their own role';
  END IF;

  -- Only allow role changes by admins
  IF NEW.role != OLD.role AND NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for role validation
DROP TRIGGER IF EXISTS validate_role_change_trigger ON users;
CREATE TRIGGER validate_role_change_trigger
  BEFORE UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION validate_role_change();