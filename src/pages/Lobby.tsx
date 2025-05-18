import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { GameVariant } from '../types/Game';
import GameList from '../components/lobby/GameList';
import MaintenanceNotice from '../components/lobby/MaintenanceNotice';
import SystemStatusNotice from '../components/lobby/SystemStatusNotice';
import { AlertTriangle, RefreshCw, Wifi, Users } from 'lucide-react';

const Lobby: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const { games = [], createGame, joinGame, startGame, deleteGame, isLoading, error, fetchGames, connectionStatus, onlinePlayers } = useGame();
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGameName, setNewGameName] = useState('');
  const [newGameVariant, setNewGameVariant] = useState<GameVariant>(GameVariant.FOUR_PLAYER);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const totalOnlinePlayers = Object.values(onlinePlayers).flat().length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchGames();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateGame = async () => {
    try {
      // Ensure we have a valid game name by using the default if newGameName is empty
      const gameName = newGameName.trim() || `${currentUser.name}'s Game`;
      
      const gameId = await createGame({
        variant: newGameVariant,
        name: gameName // Use the validated game name
      });
      setIsCreateModalOpen(false);
      navigate(`/game/${gameId}`);
    } catch (error) {
      console.error('Failed to create game:', error);
    }
  };

  const handleJoinGame = async (gameId: string) => {
    try {
      await joinGame(gameId);
      navigate(`/game/${gameId}`);
    } catch (error) {
      console.error('Failed to join game:', error);
    }
  };

  const handleStartGame = async (gameId: string) => {
    try {
      await startGame(gameId);
    } catch (error) {
      console.error('Failed to start game:', error);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    try {
      await deleteGame(gameId);
      setShowDeleteConfirm(null);
      setDeleteError(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete game');
      console.error('Failed to delete game:', error);
    }
  };

  // Filter games to show both waiting and in-progress games where the user is a player
  const availableGames = (games || []).filter(game => 
    game.state === 'waiting' || 
    game.game_players?.some(player => player.user_id === currentUser.id)
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#0F172A] to-[#1E293B] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MaintenanceNotice />
        <SystemStatusNotice />
        
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-white">Game Lobby</h1>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-orange-500/10 text-orange-400'
              }`}>
                <Wifi className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {connectionStatus === 'connected' ? 'Connected' : 'Connecting...'}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E5631]/10 text-[#2D7A47]">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {totalOnlinePlayers} {totalOnlinePlayers === 1 ? 'player' : 'players'} online
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || connectionStatus === 'disconnected'}
              className="bg-[#334155] hover:bg-[#475569] text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#1E5631] hover:bg-[#2D7A47] text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200"
            >
              Create New Game
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        <div className="min-h-[400px]">
          {isLoading && games.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D4AF37] mb-4"></div>
              <p className="text-gray-400">Loading games...</p>
            </div>
          ) : (
            <GameList
              games={availableGames}
              currentUserId={currentUser.id}
              isAdmin={isAdmin}
              onJoinGame={handleJoinGame}
              onStartGame={handleStartGame}
              onDeleteGame={(gameId) => setShowDeleteConfirm(gameId)}
              onNavigateToGame={(gameId) => navigate(`/game/${gameId}`)}
            />
          )}
        </div>

        {/* Create game modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-[#1E293B] rounded-xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b border-[#334155]">
                <h2 className="text-2xl font-bold text-white">Create New Game</h2>
              </div>
              
              <div className="p-6">
                <div className="mb-6">
                  <label className="block text-white text-sm font-bold mb-2" htmlFor="game-name">
                    Game Name
                  </label>
                  <input
                    id="game-name"
                    type="text"
                    value={newGameName}
                    onChange={(e) => setNewGameName(e.target.value)}
                    placeholder={`${currentUser.name}'s Game`}
                    className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-white text-sm font-bold mb-2">
                    Game Variant
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewGameVariant(GameVariant.FOUR_PLAYER)}
                      className={`p-3 rounded-lg border border-[#334155] text-center ${
                        newGameVariant === GameVariant.FOUR_PLAYER
                          ? 'bg-[#1E5631] text-white border-[#2D7A47]'
                          : 'bg-[#0F172A] text-gray-300 hover:bg-[#1A202C]'
                      }`}
                    >
                      <span className="block text-xl mb-1">4</span>
                      <span className="text-xs">Players</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setNewGameVariant(GameVariant.THREE_PLAYER)}
                      className={`p-3 rounded-lg border border-[#334155] text-center ${
                        newGameVariant === GameVariant.THREE_PLAYER
                          ? 'bg-[#1E5631] text-white border-[#2D7A47]'
                          : 'bg-[#0F172A] text-gray-300 hover:bg-[#1A202C]'
                      }`}
                    >
                      <span className="block text-xl mb-1">3</span>
                      <span className="text-xs">Players</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setNewGameVariant(GameVariant.TWO_PLAYER)}
                      className={`p-3 rounded-lg border border-[#334155] text-center ${
                        newGameVariant === GameVariant.TWO_PLAYER
                          ? 'bg-[#1E5631] text-white border-[#2D7A47]'
                          : 'bg-[#0F172A] text-gray-300 hover:bg-[#1A202C]'
                      }`}
                    >
                      <span className="block text-xl mb-1">2</span>
                      <span className="text-xs">Players</span>
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="bg-[#334155] hover:bg-[#475569] text-white font-bold py-2 px-4 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateGame}
                    className="bg-[#D4AF37] hover:bg-[#E9C85D] text-[#0F172A] font-bold py-2 px-4 rounded-lg"
                  >
                    Create Game
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-[#1E293B] rounded-xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b border-[#334155]">
                <h2 className="text-2xl font-bold text-white">Delete Game</h2>
              </div>
              
              <div className="p-6">
                <div className="flex items-center mb-6 bg-[#0F172A] p-4 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
                  <p className="text-white">
                    Are you sure you want to delete this game? This action cannot be undone.
                  </p>
                </div>

                {deleteError && (
                  <div className="mb-6 p-4 bg-red-900/50 border border-red-500/50 rounded-lg">
                    <p className="text-red-200">{deleteError}</p>
                  </div>
                )}
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(null);
                      setDeleteError(null);
                    }}
                    className="px-4 py-2 bg-[#334155] text-white rounded-lg hover:bg-[#475569]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteGame(showDeleteConfirm)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete Game
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Lobby;