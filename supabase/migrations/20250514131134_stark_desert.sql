/*
  # Fix admin role management

  1. Changes
    - Drop existing policies that may conflict
    - Create simplified admin policies
    - Add proper role validation
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable admin access" ON users;
DROP POLICY IF EXISTS "Enable admin role updates" ON users;
DROP POLICY IF EXISTS "Enable public read access" ON users;
DROP POLICY IF EXISTS "Enable self insert" ON users;
DROP POLICY IF EXISTS "Enable self update" ON users;

-- Create base policies
CREATE POLICY "Enable public read"
ON users FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable self management"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create admin policies
CREATE POLICY "Enable admin all"
ON users FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND raw_user_meta_data->>'role' = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND raw_user_meta_data->>'role' = 'admin'
  )
);

-- Function to sync role changes to auth.users metadata
CREATE OR REPLACE FUNCTION sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if role has changed
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Update auth.users metadata
    UPDATE auth.users
    SET raw_user_meta_data = 
      COALESCE(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', NEW.role)
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for role syncing
DROP TRIGGER IF EXISTS sync_user_role_trigger ON users;
CREATE TRIGGER sync_user_role_trigger
  AFTER UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role();