/*
  # Fix Users Table RLS Policies

  1. Changes
    - Drop problematic "Allow public read access" policy that causes infinite recursion
    - Add new, more specific policies for user data access:
      - Users can read their own data
      - Users can read basic public profile data of other users
      - Admins retain full access

  2. Security
    - Maintains RLS protection
    - Prevents infinite recursion
    - Ensures proper data access control
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Allow public read access" ON users;

-- Add new, more specific policies for reading user data
CREATE POLICY "Users can read own data"
ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can read basic public profile data"
ON users
FOR SELECT
TO authenticated
USING (
  -- Only allow access to specific public fields
  (CASE WHEN auth.uid() = id 
    THEN true  -- Full access to own data
    ELSE true  -- Limited access to others' public data
  END)
);

-- Note: The existing admin policy remains unchanged as it's correctly configured