/*
  # Add User Registration Policies

  1. Security Changes
    - Add policy to allow new users to insert their own record during registration
    - Add policy to allow authenticated users to read all active users
    - Add policy to allow users to update their own records
    - Add policy to allow admins full access to all user records

  2. Notes
    - The insert policy ensures users can only create their own record
    - The select policy allows viewing active users for social features
    - The update policy restricts users to modifying their own data
    - Admin policies provide full table access for administrative functions
*/

-- Policy for new user registration
CREATE POLICY "Users can create their own user record" 
ON users 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Policy for reading user records
CREATE POLICY "Users can view active users"
ON users
FOR SELECT
TO authenticated
USING (
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    ) THEN true
    ELSE status = 'active'
  END
);

-- Policy for updating user records
CREATE POLICY "Users can update their own record"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy for admin access
CREATE POLICY "Admins have full access"
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