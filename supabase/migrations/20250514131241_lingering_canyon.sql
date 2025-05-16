/*
  # Fix admin permissions and role management
  
  1. Changes
    - Add role validation function
    - Add role sync function
    - Update policies for proper admin access
    - Add triggers for role management
*/

-- Create function to validate role changes
CREATE OR REPLACE FUNCTION validate_role_change()
RETURNS trigger AS $$
BEGIN
  -- Only admins can change roles
  IF OLD.role != NEW.role AND NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'admin'
  ) THEN
    RAISE EXCEPTION 'only admins can change user roles';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to sync role changes to auth metadata
CREATE OR REPLACE FUNCTION sync_user_role()
RETURNS trigger AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable admin all" ON users;
DROP POLICY IF EXISTS "Enable admin all operations" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable self insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable self update for users" ON users;
DROP POLICY IF EXISTS "Enable public read" ON users;
DROP POLICY IF EXISTS "Enable self management" ON users;

-- Create new policies
CREATE POLICY "Enable admin access"
ON users
FOR ALL
TO authenticated
USING (EXISTS ( 
  SELECT 1
  FROM auth.users
  WHERE id = auth.uid()
  AND raw_user_meta_data->>'role' = 'admin'
));

CREATE POLICY "Enable self management"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable public read"
ON users
FOR SELECT
TO public
USING (true);

-- Add triggers for role management
DROP TRIGGER IF EXISTS validate_role_change_trigger ON users;
CREATE TRIGGER validate_role_change_trigger
  BEFORE UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION validate_role_change();

DROP TRIGGER IF EXISTS sync_user_role_trigger ON users;
CREATE TRIGGER sync_user_role_trigger
  AFTER UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role();