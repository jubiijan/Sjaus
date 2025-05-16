/*
  # Reset Game Schema

  1. Drop existing tables and types
    - Drop game_messages table
    - Drop game_players table
    - Drop games table
    - Drop game_state enum type
    - Drop game_variant enum type

  2. Create new types
    - game_state enum
    - game_variant enum

  3. Create new tables
    - games (main game table)
    - game_players (player participation)
    - game_messages (in-game chat)

  4. Set up security
    - Enable RLS
    - Add policies for each table
*/

-- Drop existing tables (if they exist) in correct order
DROP TABLE IF EXISTS game_messages;
DROP TABLE IF EXISTS game_players;
DROP TABLE IF EXISTS games;

-- Drop existing types
DROP TYPE IF EXISTS game_state;
DROP TYPE IF EXISTS game_variant;

-- Create new types
CREATE TYPE game_state AS ENUM ('waiting', 'bidding', 'playing', 'complete');
CREATE TYPE game_variant AS ENUM ('two-player', 'three-player', 'four-player');

-- Create games table
CREATE TABLE games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  variant game_variant NOT NULL,
  state game_state NOT NULL DEFAULT 'waiting',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  current_player_id uuid REFERENCES users(id) ON DELETE SET NULL,
  trump_suit text,
  trump_declarer uuid REFERENCES users(id) ON DELETE SET NULL,
  trump_length integer DEFAULT 0,
  score jsonb DEFAULT '{"team1": 24, "team2": 24}',
  deck jsonb[] DEFAULT '{}',
  table_cards jsonb[] DEFAULT '{}',
  current_trick jsonb[] DEFAULT '{}',
  tricks jsonb[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted boolean DEFAULT false,
  deleted_at timestamptz
);

-- Create game_players table
CREATE TABLE game_players (
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  team integer,
  hand jsonb DEFAULT '[]',
  tricks jsonb DEFAULT '[]',
  current_bid text,
  has_left boolean DEFAULT false,
  PRIMARY KEY (game_id, user_id)
);

-- Create game_messages table
CREATE TABLE game_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_games_created_by ON games(created_by);
CREATE INDEX idx_games_current_player_id ON games(current_player_id);
CREATE INDEX idx_games_trump_declarer ON games(trump_declarer);
CREATE INDEX idx_games_state ON games(state);
CREATE INDEX idx_game_players_game_id ON game_players(game_id);
CREATE INDEX idx_game_players_user_id ON game_players(user_id);
CREATE INDEX idx_game_messages_game_id ON game_messages(game_id);
CREATE INDEX idx_game_messages_user_id ON game_messages(user_id);

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for games table
CREATE POLICY "Enable game creation" ON games
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Enable game reading" ON games
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_id = games.id AND user_id = auth.uid()
    ) OR 
    created_by = auth.uid() OR 
    state = 'waiting'
  );

CREATE POLICY "Enable game updates" ON games
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_id = games.id AND user_id = auth.uid()
    ) OR 
    created_by = auth.uid()
  );

-- Create policies for game_players table
CREATE POLICY "Enable player joining" ON game_players
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable player reading" ON game_players
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE id = game_id AND (
        EXISTS (
          SELECT 1 FROM game_players gp
          WHERE gp.game_id = games.id AND gp.user_id = auth.uid()
        ) OR 
        created_by = auth.uid() OR 
        state = 'waiting'
      )
    )
  );

CREATE POLICY "Enable player updates" ON game_players
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for game_messages table
CREATE POLICY "Enable message creation" ON game_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_id = game_messages.game_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Enable message reading" ON game_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_id = game_messages.game_id AND user_id = auth.uid()
    )
  );