/*
  # Fix authentication issues
  
  1. Changes
    - Ensure admin user exists with correct permissions
    - Add RLS policy for role checking
    - Fix user table constraints
*/

-- Ensure the admin user exists
INSERT INTO auth.users (id, email)
VALUES ('676825ae-7e9f-4dcf-8944-14053c8f1a4d', 'jjoensen@fuglafjordur.com')
ON CONFLICT (id) DO NOTHING;

-- Ensure the user profile exists
INSERT INTO public.users (
  id,
  email,
  name,
  avatar,
  role,
  status
) VALUES (
  '676825ae-7e9f-4dcf-8944-14053c8f1a4d',
  'jjoensen@fuglafjordur.com',
  'Jóhan Joensen',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=jjoensen@fuglafjordur.com',
  'admin',
  'active'
)
ON CONFLICT (id) DO UPDATE
SET role = 'admin',
    status = 'active'
WHERE users.id = '676825ae-7e9f-4dcf-8944-14053c8f1a4d';

-- Add policy for checking roles
CREATE POLICY "Allow public role access" ON public.users
FOR SELECT
TO public
USING (true);

-- Ensure email case sensitivity is handled correctly
CREATE EXTENSION IF NOT EXISTS citext;
ALTER TABLE public.users ALTER COLUMN email TYPE citext;