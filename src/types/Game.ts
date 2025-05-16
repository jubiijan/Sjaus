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

export interface SystemSettings {
  allowRegistration: boolean;
  allowLogin: boolean;
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
  tricks: Trick[];
  currentBid: string | null;
  left?: boolean;
}

export interface Trick {
  cards: { playerId: string; card: Card }[];
  winner: string;
  points: number;
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
  players: Player[];
  state: GameState;
  deck: Card[];
  tableCards?: Card[];
  trumpSuit: string | null;
  trumpDeclarer: string | null;
  trumpLength: number;
  currentTrick: { playerId: string; card: Card }[];
  tricks: Trick[];
  currentPlayer: string | null;
  score: { team1: number; team2: number };
  messages: Message[];
  createdAt: string;
}