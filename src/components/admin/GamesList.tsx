import React from 'react';
import { Game, GameState } from '../../types/Game';
import { Trash2, AlertTriangle } from 'lucide-react';

interface GamesListProps {
  games: Game[];
  onDelete: (gameId: string) => void;
  onDeleteAll: () => void;
}

const GamesList: React.FC<GamesListProps> = ({ games = [], onDelete, onDeleteAll }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getGameVariantName = (variant: string): string => {
    return variant.replace('-', ' ').replace(/^\w/, c => c.toUpperCase());
  };

  const handleDelete = async (gameId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await onDelete(gameId);
    } catch (error) {
      console.error('Error deleting game:', error);
    }
  };

  if (!games.length) {
    return (
      <div className="text-center py-8 text-gray-400">
        No games found
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={onDeleteAll}
          className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Delete All Games
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-[#0F172A] text-left">
              <th className="py-3 px-4 text-gray-400 font-medium">Game ID</th>
              <th className="py-3 px-4 text-gray-400 font-medium">Name</th>
              <th className="py-3 px-4 text-gray-400 font-medium">Players</th>
              <th className="py-3 px-4 text-gray-400 font-medium">Variant</th>
              <th className="py-3 px-4 text-gray-400 font-medium">Status</th>
              <th className="py-3 px-4 text-gray-400 font-medium">Created</th>
              <th className="py-3 px-4 text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#334155]">
            {games.map(game => (
              <tr key={game.id} className="hover:bg-[#334155]">
                <td className="py-3 px-4 text-white">{game.id.substring(0, 8)}...</td>
                <td className="py-3 px-4 text-white">{game.name}</td>
                <td className="py-3 px-4 text-white">{game.players?.length || 0}</td>
                <td className="py-3 px-4 text-white capitalize">{getGameVariantName(game.variant)}</td>
                <td className="py-3 px-4">
                  <span 
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      game.state === GameState.WAITING 
                        ? 'bg-[#1E5631] bg-opacity-20 text-green-400' 
                        : game.state === GameState.COMPLETE
                        ? 'bg-[#D4AF37] bg-opacity-20 text-yellow-400'
                        : 'bg-blue-500 bg-opacity-20 text-blue-400'
                    }`}
                  >
                    {game.state}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-300">{formatDate(game.createdAt)}</td>
                <td className="py-3 px-4">
                  <button
                    onClick={(e) => handleDelete(game.id, e)}
                    className="text-red-400 hover:text-red-300 transition-colors duration-200"
                    title="Delete game"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GamesList;