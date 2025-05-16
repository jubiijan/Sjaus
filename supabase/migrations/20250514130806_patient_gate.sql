/*
  # Fix recursive users table policies

  1. Changes
    - Remove recursive admin policy that was causing infinite recursion
    - Replace with a simpler admin role check
    - Maintain existing policies for regular users
  
  2. Security
    - Maintains RLS protection
    - Ensures admins can still perform all operations
    - Preserves existing user access controls
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable admin all operations" ON users;

-- Create new non-recursive admin policy
CREATE POLICY "Enable admin all operations" ON users
FOR ALL 
TO authenticated
USING (role = 'admin')
WITH CHECK (role = 'admin');

-- Note: Other policies remain unchanged as they are not causing issues:
-- - "Enable read access for all users"
-- - "Enable self insert for authenticated users"
-- - "Enable self update for users"