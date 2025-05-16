import React from 'react';
import { Game } from '../../types/Game';
import GameCard from './GameCard';

interface GameListProps {
  games: Game[];
  currentUserId: string;
  isAdmin: boolean;
  onJoinGame: (gameId: string) => void;
  onStartGame: (gameId: string) => void;
  onDeleteGame: (gameId: string) => void;
  onNavigateToGame: (gameId: string) => void;
}

const GameList: React.FC<GameListProps> = ({
  games,
  currentUserId,
  isAdmin,
  onJoinGame,
  onStartGame,
  onDeleteGame,
  onNavigateToGame
}) => {
  if (games.length === 0) {
    return (
      <div className="bg-[#1E293B] rounded-xl p-8 text-center shadow-lg">
        <p className="text-gray-300 text-lg mb-4">No active games available</p>
        <p className="text-gray-400">
          Create a new game to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {games.map(game => {
        const isCreator = game.players && game.players[0]?.id === currentUserId;
        const isJoined = game.players && game.players.some(p => p.id === currentUserId);
        const isInProgress = game.state !== 'waiting';

        return (
          <GameCard
            key={game.id}
            game={game}
            isJoined={isJoined}
            isCreator={isCreator}
            isAdmin={isAdmin}
            isInProgress={isInProgress}
            onDelete={onDeleteGame}
            onJoin={onJoinGame}
            onNavigate={onNavigateToGame}
            onStart={onStartGame}
          />
        );
      })}
    </div>
  );
};

export default GameList;