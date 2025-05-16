import React from 'react';
import { Game, GameVariant } from '../../types/Game';
import { User, Clock, Users, Trophy, Trash2, Crown } from 'lucide-react';

interface GameCardProps {
  game: Game;
  isJoined: boolean;
  isCreator: boolean;
  isAdmin: boolean;
  isInProgress: boolean;
  onDelete: (gameId: string) => void;
  onJoin: (gameId: string) => void;
  onNavigate: (gameId: string) => void;
  onStart: (gameId: string) => void;
}

const GameCard: React.FC<GameCardProps> = ({
  game,
  isJoined,
  isCreator,
  isAdmin,
  isInProgress,
  onDelete,
  onJoin,
  onNavigate,
  onStart
}) => {
  const creator = game.players && game.players[0];

  const getGameVariantName = (variant: GameVariant): string => {
    switch (variant) {
      case GameVariant.FOUR_PLAYER: return '4-Player';
      case GameVariant.THREE_PLAYER: return '3-Player';
      case GameVariant.TWO_PLAYER: return '2-Player';
      default: return 'Unknown';
    }
  };

  const getMaxPlayers = (variant: GameVariant): number => {
    switch (variant) {
      case GameVariant.FOUR_PLAYER: return 4;
      case GameVariant.THREE_PLAYER: return 3;
      case GameVariant.TWO_PLAYER: return 2;
      default: return 4;
    }
  };

  const formatTimeAgo = (date: string): string => {
    const now = new Date();
    const gameDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - gameDate.getTime()) / 1000);

    if (isNaN(diffInSeconds)) return 'Just now';

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return gameDate.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isFull = game.players && game.players.length >= getMaxPlayers(game.variant);

  return (
    <div className="group bg-[#1E293B] rounded-xl shadow-lg overflow-hidden border border-[#334155] hover:border-[#D4AF37] transition-all duration-300 transform hover:-translate-y-1">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent z-10" />
        <div className="h-32 bg-gradient-to-r from-[#1E5631] to-[#2D7A47] relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] animate-[pan_20s_linear_infinite]" />
          </div>
        </div>
        <div className="absolute top-4 left-4 z-20">
          <h3 className="text-xl font-bold text-white truncate max-w-[200px]">{game.name}</h3>
          {creator && (
            <p className="text-sm text-gray-300 flex items-center mt-1">
              <Crown className="h-4 w-4 mr-1 text-[#D4AF37]" />
              {creator.name}
            </p>
          )}
        </div>
        {(isAdmin || isCreator) && (
          <button
            onClick={() => onDelete(game.id)}
            className="absolute top-4 right-4 z-20 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete game"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-1" />
            <span>{getGameVariantName(game.variant)}</span>
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            <span>{formatTimeAgo(game.createdAt)}</span>
          </div>
          {isInProgress && (
            <span className="text-[#D4AF37] flex items-center">
              <Trophy className="h-4 w-4 mr-1" />
              In Progress
            </span>
          )}
        </div>

        <div className="flex items-center mb-4">
          <div className="flex -space-x-2 mr-2">
            {(game.players || []).map((player, index) => (
              <div 
                key={player.id}
                className="w-8 h-8 rounded-full border-2 border-[#1E293B] overflow-hidden bg-gray-700"
                title={player.name}
                style={{ 
                  backgroundImage: `url(${player.avatar})`,
                  backgroundSize: 'cover',
                  zIndex: game.players ? game.players.length - index : 0
                }}
              />
            ))}
            {[...Array(getMaxPlayers(game.variant) - (game.players?.length || 0))].map((_, i) => (
              <div 
                key={`empty-${i}`} 
                className="w-8 h-8 rounded-full border-2 border-[#1E293B] bg-gray-800 flex items-center justify-center"
              >
                <User className="h-4 w-4 text-gray-600" />
              </div>
            ))}
          </div>
          <div className="text-sm text-gray-400">
            {game.players?.length || 0}/{getMaxPlayers(game.variant)}
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          {isJoined ? (
            <span className="text-sm text-[#10B981] flex items-center">
              <Trophy className="h-4 w-4 mr-1" />
              Joined
            </span>
          ) : (
            <span></span>
          )}
          
          {isCreator && !isInProgress ? (
            <button
              onClick={() => onStart(game.id)}
              disabled={!game.players || game.players.length < 2}
              className={`px-4 py-2 rounded-lg font-semibold flex items-center ${
                game.players && game.players.length >= 2
                  ? 'bg-[#D4AF37] hover:bg-[#E9C85D] text-[#0F172A]'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Trophy className="mr-1 h-4 w-4" />
              Start Game
            </button>
          ) : isJoined ? (
            <button
              onClick={() => onNavigate(game.id)}
              className="bg-[#1E5631] hover:bg-[#2D7A47] text-white px-4 py-2 rounded-lg font-semibold"
            >
              {isInProgress ? 'Return to Game' : 'Join Game'}
            </button>
          ) : (
            <button
              onClick={() => onJoin(game.id)}
              disabled={isFull || isInProgress}
              className={`px-4 py-2 rounded-lg font-semibold ${
                isFull || isInProgress
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-[#1E5631] hover:bg-[#2D7A47] text-white'
              }`}
            >
              Join Game
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameCard;