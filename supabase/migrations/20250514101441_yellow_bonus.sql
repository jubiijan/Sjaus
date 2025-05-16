/*
  # Fix game-related policies and constraints

  1. Changes
    - Add missing INSERT policies for games and game_players
    - Fix RLS policies to allow proper game creation and joining
    - Add proper constraints for game state values
*/

-- Add game state enum type
DO $$ BEGIN
  CREATE TYPE game_state AS ENUM ('waiting', 'bidding', 'playing', 'complete');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add game variant enum type
DO $$ BEGIN
  CREATE TYPE game_variant AS ENUM ('two-player', 'three-player', 'four-player');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update games table constraints
ALTER TABLE games
  DROP CONSTRAINT IF EXISTS games_state_check,
  DROP CONSTRAINT IF EXISTS games_variant_check,
  ALTER COLUMN state TYPE game_state USING state::game_state,
  ALTER COLUMN variant TYPE game_variant USING variant::game_variant;

-- Drop existing game policies
DROP POLICY IF EXISTS "Anyone can read games" ON games;
DROP POLICY IF EXISTS "Players can update their games" ON games;

-- Create comprehensive game policies
CREATE POLICY "Enable read access for all users"
ON games FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable game creation for authenticated users"
ON games FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable game updates for players"
ON games FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM game_players
    WHERE game_players.game_id = id
    AND game_players.user_id = auth.uid()
  )
);

-- Drop existing game_players policies
DROP POLICY IF EXISTS "Anyone can read game players" ON game_players;
DROP POLICY IF EXISTS "Players can update their game data" ON game_players;

-- Create comprehensive game_players policies
CREATE POLICY "Enable read access for all users"
ON game_players FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable players to join games"
ON game_players FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM games
    WHERE games.id = game_id
    AND games.state = 'waiting'
  )
);

CREATE POLICY "Enable players to update their own data"
ON game_players FOR UPDATE
TO authenticated
USING (user_id = auth.uid());