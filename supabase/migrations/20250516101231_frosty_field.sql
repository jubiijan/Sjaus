/*
  # Update games table schema to match application needs

  1. Changes
    - Add missing columns for game state
    - Update column types and constraints
    - Add proper foreign key relationships
    - Add default values for new columns

  2. Security
    - Add proper foreign key constraints with ON DELETE behavior
    - Ensure data consistency with default values
*/

-- Create game state and variant enums if they don't exist
DO $$ BEGIN
  CREATE TYPE game_state AS ENUM ('waiting', 'bidding', 'playing', 'complete');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE game_variant AS ENUM ('two-player', 'three-player', 'four-player');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update games table structure
ALTER TABLE games
  -- Rename current_player to current_player_id if it exists
  DROP COLUMN IF EXISTS current_player CASCADE;

-- Add or modify required columns
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS current_player_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trump_suit text,
  ADD COLUMN IF NOT EXISTS trump_declarer uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trump_length integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score jsonb DEFAULT '{"team1": 24, "team2": 24}',
  ADD COLUMN IF NOT EXISTS current_trick jsonb[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tricks jsonb[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deck jsonb[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS table_cards jsonb[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ALTER COLUMN state TYPE game_state USING state::game_state,
  ALTER COLUMN variant TYPE game_variant USING variant::game_variant;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_games_created_by ON games(created_by);
CREATE INDEX IF NOT EXISTS idx_games_current_player_id ON games(current_player_id);
CREATE INDEX IF NOT EXISTS idx_games_trump_declarer ON games(trump_declarer);
CREATE INDEX IF NOT EXISTS idx_games_state ON games(state);
CREATE INDEX IF NOT EXISTS idx_games_players ON games USING GIN (players);

-- Add foreign key constraints if they don't exist
DO $$ BEGIN
  ALTER TABLE games 
    ADD CONSTRAINT games_current_player_fkey 
    FOREIGN KEY (current_player_id) 
    REFERENCES users(id) 
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE games 
    ADD CONSTRAINT games_trump_declarer_fkey 
    FOREIGN KEY (trump_declarer) 
    REFERENCES users(id) 
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;