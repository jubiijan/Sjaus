import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useGame } from './GameContext';
import { Game } from '../types/Game';
import { supabase } from '../lib/supabase';

const LobbyComponent: React.FC = () => {
  const { currentUser } = useAuth();
  const { games, joinGame, connectionStatus } = useGame();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  // Filter games to show both waiting and in-progress games where the user is a player
  const availableGames = games.filter(game => 
    game.state === 'waiting' || 
    (game.players && game.players.some(p => p.id === currentUser?.id))
  );

  const handleJoinGame = async (gameId: string) => {
    if (!currentUser) return;
    
    try {
      setError(null);
      await joinGame(gameId, currentUser.id);
      navigate(`/game/${gameId}`);
    } catch (error) {
      console.error('Error joining game:', error);
      setError(error instanceof Error ? error.message : 'Failed to join game');
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-bold text-white">Available Games</h2>
          <div className={`ml-4 px-3 py-1 rounded-full text-sm ${
            connectionStatus === 'connected'
              ? 'bg-green-500 bg-opacity-10 text-green-400'
              : 'bg-red-500 bg-opacity-10 text-red-400'
          }`}>
            {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      {availableGames.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No games available. Create a new game to get started!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableGames.map(game => (
            <GameCard
              key={game.id}
              game={game}
              onJoin={handleJoinGame}
              currentUserId={currentUser?.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface GameCardProps {
  game: Game;
  onJoin: (gameId: string) => void;
  currentUserId?: string;
}

const GameCard: React.FC<GameCardProps> = ({ game, onJoin, currentUserId }) => {
  const isJoined = game.players.some(p => p.id === currentUserId);
  const maxPlayers = game.variant === 'four-player' ? 4 : 
                    game.variant === 'three-player' ? 3 : 2;
  const activePlayers = game.players.filter(p => !p.left);
  const isFull = activePlayers.length >= maxPlayers;

  return (
    <div className="bg-[#1E293B] rounded-lg p-4 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">{game.name}</h3>
        <span className={`px-2 py-1 rounded-full text-xs ${
          game.state === 'waiting'
            ? 'bg-[#1E5631] bg-opacity-20 text-green-400'
            : 'bg-[#D4AF37] bg-opacity-20 text-yellow-400'
        }`}>
          {game.state}
        </span>
      </div>

      <div className="mb-4">
        <p className="text-gray-400 text-sm">
          Players: {activePlayers.length}/{maxPlayers}
        </p>
        <p className="text-gray-400 text-sm">
          Variant: {game.variant}
        </p>
      </div>

      {isJoined ? (
        <button
          onClick={() => onJoin(game.id)}
          className="w-full bg-[#1E5631] hover:bg-[#2D7A47] text-white font-bold py-2 px-4 rounded-lg"
        >
          {game.state === 'waiting' ? 'Join Game' : 'Return to Game'}
        </button>
      ) : (
        <button
          onClick={() => onJoin(game.id)}
          disabled={isFull}
          className={`w-full font-bold py-2 px-4 rounded-lg ${
            isFull
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-[#1E5631] hover:bg-[#2D7A47] text-white'
          }`}
        >
          {isFull ? 'Game Full' : 'Join Game'}
        </button>
      )}
    </div>
  );
};

export default LobbyComponent;