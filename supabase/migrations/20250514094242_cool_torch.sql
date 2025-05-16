/*
  # Initial schema setup for Sjaus card game

  1. New Tables
    - users: Player accounts and profiles
    - games: Game sessions and their states
    - game_players: Player participation in games
    - game_messages: In-game chat messages

  2. Security
    - Enable RLS on all tables
    - Set up policies for authenticated access
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable citext extension for case-insensitive email handling
CREATE EXTENSION IF NOT EXISTS citext;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email citext UNIQUE NOT NULL,
  name text NOT NULL,
  avatar text,
  role text DEFAULT 'user',
  games_played integer DEFAULT 0,
  games_won integer DEFAULT 0,
  rating integer DEFAULT 1200,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  last_login timestamptz DEFAULT now()
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  variant text NOT NULL,
  state text NOT NULL,
  trump_suit text,
  trump_declarer uuid REFERENCES users(id),
  trump_length integer DEFAULT 0,
  current_player uuid REFERENCES users(id),
  score_team1 integer DEFAULT 24,
  score_team2 integer DEFAULT 24,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Game players table
CREATE TABLE IF NOT EXISTS game_players (
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  team integer,
  hand jsonb DEFAULT '[]'::jsonb,
  tricks jsonb DEFAULT '[]'::jsonb,
  current_bid text,
  has_left boolean DEFAULT false,
  PRIMARY KEY (game_id, user_id)
);

-- Game messages table
CREATE TABLE IF NOT EXISTS game_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS games ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS game_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Anyone can read games" ON games;
DROP POLICY IF EXISTS "Players can update their games" ON games;
DROP POLICY IF EXISTS "Anyone can read game players" ON game_players;
DROP POLICY IF EXISTS "Players can update their game data" ON game_players;
DROP POLICY IF EXISTS "Anyone can read game messages" ON game_messages;
DROP POLICY IF EXISTS "Players can create messages in their games" ON game_messages;

-- Users policies
CREATE POLICY "Users can read their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Games policies
CREATE POLICY "Anyone can read games"
  ON games
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Players can update their games"
  ON games
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_id = games.id
      AND user_id = auth.uid()
    )
  );

-- Game players policies
CREATE POLICY "Anyone can read game players"
  ON game_players
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Players can update their game data"
  ON game_players
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Game messages policies
CREATE POLICY "Anyone can read game messages"
  ON game_messages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Players can create messages in their games"
  ON game_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_id = game_messages.game_id
      AND user_id = auth.uid()
    )
  );