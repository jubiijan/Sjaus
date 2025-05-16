import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import GameTable from '../components/game/GameTable';
import GameChat from '../components/game/GameChat';
import PlayerView from '../components/game/PlayerView';
import TrumpBidding from '../components/game/TrumpBidding';
import { Game } from '../types/Game';

const GameRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const { joinGame, leaveGame, currentGame } = useGame();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId || !user) return;

    const initializeGame = async () => {
      try {
        setLoading(true);
        await joinGame(roomId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to join game');
      } finally {
        setLoading(false);
      }
    };

    initializeGame();

    return () => {
      if (roomId) {
        leaveGame(roomId);
      }
    };
  }, [roomId, user, joinGame, leaveGame]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  if (!currentGame) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Game not found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#1E293B] text-white">
      <div className="flex-1 flex flex-col lg:flex-row">
        <div className="flex-1 p-4">
          <GameTable game={currentGame as Game} />
          {currentGame.state === 'bidding' && (
            <TrumpBidding game={currentGame as Game} />
          )}
          <PlayerView game={currentGame as Game} />
        </div>
        <div className="w-full lg:w-1/4 p-4">
          <GameChat gameId={currentGame.id} />
        </div>
      </div>
    </div>
  );
};

export default GameRoom;