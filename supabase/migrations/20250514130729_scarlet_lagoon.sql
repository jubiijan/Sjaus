/*
  # Fix admin role update functionality

  1. Changes
    - Add policy for admin role updates
    - Add constraint to prevent self-role modification
    - Add trigger to validate role changes
*/

-- Drop existing admin policies
DROP POLICY IF EXISTS "Enable admin all operations" ON users;
DROP POLICY IF EXISTS "Enable admin role updates" ON users;

-- Create function to validate role changes
CREATE OR REPLACE FUNCTION validate_role_change()
RETURNS TRIGGER AS $$
DECLARE
  admin_role TEXT;
BEGIN
  -- Get the role of the user attempting the update
  SELECT role INTO admin_role 
  FROM users 
  WHERE id = auth.uid();

  -- Only allow role changes by admins
  IF NEW.role != OLD.role AND admin_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;

  -- Prevent users from modifying their own role
  IF auth.uid() = OLD.id AND NEW.role != OLD.role THEN
    RAISE EXCEPTION 'Users cannot modify their own role';
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

-- Create admin policies
CREATE POLICY "Enable admin all operations"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );