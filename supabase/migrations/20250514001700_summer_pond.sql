/*
  # Fix authentication and admin user setup

  1. Changes
    - Enable UUID extension if not enabled
    - Create auth schema if it doesn't exist
    - Set up proper auth tables and triggers
    - Ensure admin user exists with correct permissions
    - Fix email case sensitivity
    - Add necessary policies
*/

-- Create auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;

-- Ensure users table has correct columns and constraints
ALTER TABLE public.users
ALTER COLUMN email TYPE citext,
ALTER COLUMN email SET NOT NULL,
ALTER COLUMN name SET NOT NULL;

-- Add unique constraint on email if not exists
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_email_key'
  ) THEN
    ALTER TABLE public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);
  END IF;
END $$;

-- Ensure admin user exists in auth schema
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
VALUES (
  '676825ae-7e9f-4dcf-8944-14053c8f1a4d',
  'jjoensen@fuglafjordur.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    email_confirmed_at = EXCLUDED.email_confirmed_at;

-- Ensure admin user exists in public schema
INSERT INTO public.users (
  id,
  email,
  name,
  avatar,
  role,
  status,
  created_at,
  last_login
)
VALUES (
  '676825ae-7e9f-4dcf-8944-14053c8f1a4d',
  'jjoensen@fuglafjordur.com',
  'Jóhan Joensen',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=jjoensen@fuglafjordur.com',
  'admin',
  'active',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE
SET role = 'admin',
    status = 'active',
    email = EXCLUDED.email;

-- Add or update necessary policies
DROP POLICY IF EXISTS "Allow public role access" ON public.users;
CREATE POLICY "Allow public role access" ON public.users
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Users can read their own data" ON public.users;
CREATE POLICY "Users can read their own data" ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.email,
    'user',
    'active'
  );
  RETURN NEW;
END;
$$ language plpgsql security definer;

-- Create trigger for new user handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();