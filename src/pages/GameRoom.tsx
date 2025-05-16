import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import GameTable from '../components/game/GameTable';
import GameChat from '../components/game/GameChat';
import TrumpBidding from '../components/game/TrumpBidding';
import ShareButton from '../components/ShareButton';
import { ArrowLeft, Trophy, Users, AlertTriangle, Clock, Crown, Shield, User, Calendar, Star, Award, Wifi, WifiOff } from 'lucide-react';

const GameRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { currentUser, isAdmin } = useAuth();
  const { 
    games, 
    joinGame, 
    leaveGame, 
    startGame, 
    deleteGame,
    subscribeToGame,
    unsubscribeFromGame,
    connectionStatus,
    isLoading,
    error: gameError,
    fetchGames
  } = useGame();
  const navigate = useNavigate();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const game = games.find(g => g.id === roomId);

  const shareUrl = `${window.location.origin}/game/${roomId}`;
  const shareTitle = game ? `Join me for a game of Sjaus - ${game.name}` : 'Join my Sjaus game';
  const shareDescription = 'Play Sjaus, the traditional Faeroese card game, online with friends!';

  // Subscribe to game updates and join game
  useEffect(() => {
    if (!roomId || !currentUser) return;

    const initializeGame = async () => {
      try {
        // Set up subscription first
        subscribeToGame(roomId);
        
        // Attempt to join the game
        await joinGame(roomId, currentUser.id);
        
        // Fetch latest game state
        await fetchGames();
      } catch (err) {
        console.error('Error initializing game:', err);
        setError(err instanceof Error ? err.message : 'Failed to join game');
      }
    };

    initializeGame();

    // Cleanup subscription when component unmounts
    return () => {
      unsubscribeFromGame(roomId);
    };
  }, [roomId, currentUser, subscribeToGame, unsubscribeFromGame, joinGame, fetchGames]);

  const handleLeaveGame = async () => {
    if (!roomId || !currentUser) return;
    
    try {
      await leaveGame(roomId, currentUser.id);
      navigate('/lobby');
    } catch (err) {
      console.error('Error leaving game:', err);
      // Still navigate away even if there was an error
      navigate('/lobby');
    }
  };

  const handleDeleteGame = async () => {
    if (!roomId || !isAdmin) return;
    
    try {
      await deleteGame(roomId);
      navigate('/lobby');
    } catch (err) {
      console.error('Error deleting game:', err);
      // Still navigate away even if there was an error
      navigate('/lobby');
    }
  };

  const handleStartGame = async () => {
    if (!roomId) return;
    
    try {
      await startGame(roomId);
    } catch (err) {
      console.error('Error starting game:', err);
      setError(err instanceof Error ? err.message : 'Failed to start game');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Loading state
  if (isLoading && !game) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#0F172A]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D4AF37] mb-4"></div>
          <h2 className="text-2xl font-bold text-white">Loading game...</h2>
        </div>
      </div>
    );
  }

  // Error state
  if ((error || gameError) && !game) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#0F172A]">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Error Loading Game</h2>
          <p className="text-gray-300 mb-6">{error || gameError}</p>
          <button
            onClick={() => navigate('/lobby')}
            className="bg-[#1E5631] hover:bg-[#2D7A47] text-white font-bold py-2 px-4 rounded-lg"
          >
            Return to Lobby
          </button>
        </div>
      </div>
    );
  }

  // Game not found
  if (!game) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#0F172A]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Game not found</h2>
          <button
            onClick={() => navigate('/lobby')}
            className="bg-[#1E5631] hover:bg-[#2D7A47] text-white font-bold py-2 px-4 rounded-lg"
          >
            Return to Lobby
          </button>
        </div>
      </div>
    );
  }

  const isCreator = game.players && game.players.length > 0 && game.players[0]?.id === currentUser?.id;
  const isBiddingPhase = game.state === 'bidding';
  const isWaiting = game.state === 'waiting';
  const hasLeft = game.players?.find(p => p.id === currentUser?.id)?.left;
  const isCurrentPlayerInGame = game.players?.some(p => p.id === currentUser?.id && !p.left);

  const getVariantDetails = (variant: string) => {
    switch (variant) {
      case 'four-player':
        return {
          name: '4-Player Classic',
          description: 'Two teams of two players compete in this traditional variant',
          players: 4,
          teams: true,
          icon: <Users className="h-6 w-6 text-[#D4AF37]" />
        };
      case 'three-player':
        return {
          name: '3-Player Challenge',
          description: 'One player against a team of two',
          players: 3,
          teams: true,
          icon: <Users className="h-6 w-6 text-[#D4AF37]" />
        };
      case 'two-player':
        return {
          name: '2-Player Duel',
          description: 'Head-to-head competition',
          players: 2,
          teams: false,
          icon: <Users className="h-6 w-6 text-[#D4AF37]" />
        };
      default:
        return {
          name: 'Unknown Variant',
          description: 'Game variant details not available',
          players: 0,
          teams: false,
          icon: <AlertTriangle className="h-6 w-6 text-[#D4AF37]" />
        };
    }
  };

  const variantInfo = getVariantDetails(game.variant);
  const activePlayers = game.players?.filter(p => !p.left) || [];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0F172A] py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Game header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="mr-4 text-gray-400 hover:text-white"
              title="Return to lobby"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold text-white">{game.name}</h1>
            <div className="ml-4 flex items-center text-sm bg-[#1E293B] px-3 py-1 rounded-lg">
              <Users className="h-4 w-4 mr-1 text-gray-400" />
              <span className="text-gray-300">{game.variant}</span>
            </div>
            
            {/* Connection Status Indicator */}
            <div className={`ml-4 flex items-center text-sm px-3 py-1 rounded-lg transition-colors ${
              connectionStatus === 'connected' 
                ? 'bg-[#1E5631]/40 text-green-400' 
                : 'bg-red-900/40 text-red-400'
            }`}>
              {connectionStatus === 'connected' 
                ? <Wifi className="h-4 w-4 mr-1" />
                : <WifiOff className="h-4 w-4 mr-1" />
              }
              <span>{connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <ShareButton url={shareUrl} title={shareTitle} description={shareDescription} />
            
            {(isAdmin || isCreator) && (
              <button
                onClick={handleDeleteGame}
                className="px-4 py-2 rounded-lg font-semibold flex items-center bg-red-600 hover:bg-red-700 text-white"
              >
                <AlertTriangle className="mr-1 h-4 w-4" />
                Delete Game
              </button>
            )}
            
            {isWaiting && isCreator && (
              <button
                onClick={handleStartGame}
                disabled={activePlayers.length < 2}
                className={`px-4 py-2 rounded-lg font-semibold flex items-center ${
                  activePlayers.length >= 2
                    ? 'bg-[#D4AF37] hover:bg-[#E9C85D] text-[#0F172A]'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Trophy className="mr-1 h-4 w-4" />
                Start Game
              </button>
            )}
          </div>
        </div>
        
        {error && (
          <div className="mb-6 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg p-4">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {hasLeft && (
          <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">
            <p>You have left this game. Other players can continue playing.</p>
            {!isCurrentPlayerInGame && (
              <button
                onClick={() => joinGame(roomId!, currentUser!.id)}
                className="mt-2 bg-red-500 bg-opacity-20 hover:bg-opacity-30 text-red-400 px-3 py-1 rounded"
              >
                Rejoin Game
              </button>
            )}
          </div>
        )}
        
        {/* Waiting state */}
        {isWaiting ? (
          <div className="bg-[#1E293B] rounded-xl p-8 shadow-lg">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Game Information */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <Trophy className="h-7 w-7 text-[#D4AF37] mr-3" />
                  Game Information
                </h2>
                <div className="space-y-6">
                  {/* Variant Info */}
                  <div className="bg-gradient-to-br from-[#1E5631]/30 to-[#2D7A47]/30 rounded-lg p-6 border border-[#1E5631]/20">
                    <div className="flex items-center mb-3">
                      {variantInfo.icon}
                      <h3 className="text-xl font-semibold text-white ml-3">{variantInfo.name}</h3>
                    </div>
                    <p className="text-gray-300">{variantInfo.description}</p>
                    <div className="mt-4 flex items-center text-[#D4AF37]">
                      <Star className="h-5 w-5 mr-2" />
                      <span>{variantInfo.teams ? 'Team-based gameplay' : 'Individual gameplay'}</span>
                    </div>
                  </div>

                  {/* Creation Time */}
                  <div className="bg-gradient-to-br from-[#8B4513]/30 to-[#A65C2E]/30 rounded-lg p-6 border border-[#8B4513]/20">
                    <div className="flex items-center mb-3">
                      <Calendar className="h-6 w-6 text-[#D4AF37]" />
                      <h3 className="text-xl font-semibold text-white ml-3">Created</h3>
                    </div>
                    <p className="text-gray-300">{formatDate(game.createdAt)}</p>
                  </div>

                  {/* Game Status */}
                  <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-lg p-6 border border-[#334155]">
                    <div className="flex items-center mb-3">
                      <Award className="h-6 w-6 text-[#D4AF37]" />
                      <h3 className="text-xl font-semibold text-white ml-3">Game Status</h3>
                    </div>
                    <div className="space-y-2">
                      <p className="text-gray-300 flex items-center">
                        <Shield className="h-5 w-5 mr-2 text-[#1E5631]" />
                        {variantInfo.teams ? 'Teams will be assigned when the game starts' : 'Individual scoring'}
                      </p>
                      <p className="text-gray-300 flex items-center">
                        <Trophy className="h-5 w-5 mr-2 text-[#D4AF37]" />
                        First to reach 0 points wins
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Players */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <Users className="h-7 w-7 text-[#D4AF37] mr-3" />
                  Players ({activePlayers.length}/{variantInfo.players})
                </h2>
                <div className="space-y-4">
                  {activePlayers.map((player) => (
                    <div 
                      key={player.id} 
                      className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] rounded-lg p-6 border border-[#334155] transform transition-all duration-300 hover:scale-[1.02] hover:border-[#D4AF37]/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div 
                            className="w-12 h-12 rounded-full bg-cover bg-center mr-4 ring-2 ring-[#D4AF37] ring-offset-2 ring-offset-[#0F172A]"
                            style={{ backgroundImage: `url(${player.avatar})` }}
                          />
                          <div>
                            <div className="flex items-center">
                              <p className="font-medium text-white">{player.name}</p>
                              {game.players && game.players.length > 0 && player.id === game.players[0].id && (
                                <span className="ml-2 bg-gradient-to-r from-[#1E5631] to-[#2D7A47] px-3 py-1 rounded-full text-xs text-white flex items-center shadow-lg">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Host
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">
                              Rating: {player.rating || 1200}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Empty slots */}
                  {Array.from({ length: variantInfo.players - activePlayers.length }).map((_, i) => (
                    <div 
                      key={`empty-${i}`} 
                      className="bg-[#0F172A]/50 rounded-lg p-6 flex items-center border border-dashed border-gray-700"
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mr-4">
                        <User className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-500">Waiting for player...</p>
                        <p className="text-sm text-gray-600">Open slot</p>
                      </div>
                    </div>
                  ))}
                </div>

                {isCreator && activePlayers.length < 2 && (
                  <div className="mt-6 bg-gradient-to-r from-[#D4AF37]/10 to-[#E9C85D]/10 rounded-lg p-6 border border-[#D4AF37]/20">
                    <div className="flex items-center text-[#D4AF37]">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      <p>Waiting for more players</p>
                    </div>
                    <p className="text-gray-400 mt-2">
                      Share the game link with friends to invite them to join
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Game table */}
            <GameTable game={game} />
            
            {/* Bidding UI */}
            {isBiddingPhase && currentUser && game.currentPlayer === currentUser.id && (
              <TrumpBidding game={game} />
            )}
            
            {/* Chat */}
            <GameChat game={game} />
          </>
        )}
      </div>

      {/* Leave game confirmation modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-[#1E293B] rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#334155]">
              <h2 className="text-2xl font-bold text-white">Leave Game?</h2>
            </div>
            
            <div className="p-6">
              <div className="flex items-center mb-6 bg-[#0F172A] p-4 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-[#D4AF37] mr-3" />
                <p className="text-white">
                  {game.state === 'waiting'
                    ? "Are you sure you want to leave this game? You can rejoin later if there are open slots."
                    : "Are you sure you want to leave this game? The game will continue without you, but you can return to it from the lobby."}
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="px-4 py-2 bg-[#334155] text-white rounded-lg hover:bg-[#475569]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLeaveGame}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Leave Game
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameRoom;