export enum GameVariant {
  FOUR_PLAYER = 'four-player',
  THREE_PLAYER = 'three-player',
  TWO_PLAYER = 'two-player'
}

export enum GameState {
  WAITING = 'waiting',
  BIDDING = 'bidding',
  PLAYING = 'playing',
  COMPLETE = 'complete'
}

export interface Card {
  suit: string;
  rank: string;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  hand: Card[];
  tricks: Card[];
  hasLeft?: boolean;
}

export interface Message {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  timestamp: string;
}

export interface Game {
  id: string;
  name: string;
  variant: GameVariant;
  state: GameState;
  created_by: string;
  current_player_id?: string;
  trump_suit?: string;
  trump_declarer?: string;
  trump_length?: number;
  score: { team1: number; team2: number };
  deck: Card[];
  table_cards?: Card[];
  current_trick: Card[];
  tricks: Card[];
  players: Player[];
  messages: Message[];
  created_at: string;
  updated_at: string;
  deleted?: boolean;
  deleted_at?: string;
}

export interface GameCreationOptions {
  name: string;
  variant: GameVariant;
  isPrivate?: boolean;
  password?: string;
}