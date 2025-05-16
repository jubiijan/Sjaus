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