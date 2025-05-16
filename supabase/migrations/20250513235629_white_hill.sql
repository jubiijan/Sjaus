/*
  # Create admin user

  1. Changes
    - Insert admin user with hashed password (handled by Supabase Auth)
    - Set user role as admin
*/

-- Insert the admin user
INSERT INTO users (
  id,
  email,
  name,
  avatar,
  role,
  games_played,
  games_won,
  rating,
  status
) VALUES (
  '676825ae-7e9f-4dcf-8944-14053c8f1a4d',
  'jjoensen@fuglafjordur.com',
  'Jóhan Joensen',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=jjoensen@fuglafjordur.com',
  'admin',
  0,
  0,
  1200,
  'active'
)
ON CONFLICT (email) DO UPDATE
SET role = 'admin'
WHERE users.email = 'jjoensen@fuglafjordur.com';