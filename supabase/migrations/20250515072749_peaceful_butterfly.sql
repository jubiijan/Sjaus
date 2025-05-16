/*
  # Add trigger for automatic user profile creation

  1. Changes
    - Create trigger function to handle new user creation
    - Add trigger to automatically create user profile when auth.users is updated
    
  2. Security
    - Function runs with security definer to ensure proper permissions
    - Only creates profile for new users, not updates
*/

-- Create the trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    name,
    avatar,
    role,
    status,
    games_played,
    games_won,
    rating
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar',
    'user',
    'active',
    0,
    0,
    1200
  );
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();