import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGame } from '../../contexts/GameContext';
import { Game } from '../../types/Game';

interface TrumpBiddingProps {
  game: Game;
}

const TrumpBidding: React.FC<TrumpBiddingProps> = ({ game }) => {
  const { currentUser } = useAuth();
  const { declareTrump, passTrump } = useGame();
  const [selectedSuit, setSelectedSuit] = useState<string>('');
  const [selectedLength, setSelectedLength] = useState<number>(5);
  
  if (!currentUser) return null;
  if (game.state !== 'bidding' || game.currentPlayer !== currentUser.id) return null;
  
  const handleDeclare = () => {
    if (!selectedSuit) return;
    declareTrump(game.id, currentUser.id, selectedSuit, selectedLength);
  };
  
  const handlePass = () => {
    passTrump(game.id, currentUser.id);
  };
  
  const isValidBid = () => {
    if (!selectedSuit) return false;
    
    // If current trump is clubs with same length, only clubs can outbid
    if (game.trumpSuit === 'clubs' && game.trumpLength === selectedLength) {
      return selectedSuit === 'clubs';
    }
    
    // Must have a longer trump length than current bid
    if (game.trumpLength > 0 && selectedLength <= game.trumpLength) {
      return false;
    }
    
    return true;
  };
  
  return (
    <div className="absolute bottom-28 left-1/2 transform -translate-x-1/2 z-30 bg-[#1E293B] p-4 rounded-lg shadow-lg w-96">
      <h3 className="text-xl font-bold text-white mb-4 text-center">
        Your Turn to Bid
      </h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Select Trump Suit:
        </label>
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setSelectedSuit('hearts')}
            className={`p-3 rounded-lg flex flex-col items-center justify-center border
              ${selectedSuit === 'hearts' 
                ? 'bg-red-600 text-white border-white' 
                : 'bg-[#334155] text-gray-300 border-transparent hover:bg-[#475569]'}`}
          >
            <span className="text-2xl">♥</span>
            <span className="text-xs mt-1">Hearts</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedSuit('diamonds')}
            className={`p-3 rounded-lg flex flex-col items-center justify-center border
              ${selectedSuit === 'diamonds' 
                ? 'bg-red-600 text-white border-white' 
                : 'bg-[#334155] text-gray-300 border-transparent hover:bg-[#475569]'}`}
          >
            <span className="text-2xl">♦</span>
            <span className="text-xs mt-1">Diamonds</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedSuit('clubs')}
            className={`p-3 rounded-lg flex flex-col items-center justify-center border
              ${selectedSuit === 'clubs' 
                ? 'bg-[#1E5631] text-white border-white' 
                : 'bg-[#334155] text-gray-300 border-transparent hover:bg-[#475569]'}`}
          >
            <span className="text-2xl">♣</span>
            <span className="text-xs mt-1">Clubs</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedSuit('spades')}
            className={`p-3 rounded-lg flex flex-col items-center justify-center border
              ${selectedSuit === 'spades' 
                ? 'bg-[#1E5631] text-white border-white' 
                : 'bg-[#334155] text-gray-300 border-transparent hover:bg-[#475569]'}`}
          >
            <span className="text-2xl">♠</span>
            <span className="text-xs mt-1">Spades</span>
          </button>
        </div>
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Trump Length: {selectedLength}
        </label>
        <input
          type="range"
          min="5"
          max="13"
          value={selectedLength}
          onChange={(e) => setSelectedLength(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>5</span>
          <span>7</span>
          <span>9</span>
          <span>11</span>
          <span>13</span>
        </div>
      </div>
      
      <div className="flex justify-between">
        <button
          type="button"
          onClick={handlePass}
          className="bg-[#334155] hover:bg-[#475569] text-white font-bold py-2 px-4 rounded-lg"
        >
          Pass
        </button>
        <button
          type="button"
          onClick={handleDeclare}
          disabled={!isValidBid()}
          className={`font-bold py-2 px-4 rounded-lg ${
            isValidBid()
              ? 'bg-[#D4AF37] hover:bg-[#E9C85D] text-[#0F172A]'
              : 'bg-gray-500 cursor-not-allowed text-gray-300'
          }`}
        >
          Declare Trump
        </button>
      </div>
      
      {game.trumpSuit && (
        <div className="mt-4 p-2 bg-[#0F172A] rounded-lg text-sm">
          <p className="text-gray-300">
            Current highest bid: <span className="font-bold text-white">{game.trumpLength}</span> in 
            <span className="font-bold text-white capitalize ml-1">
              {game.trumpSuit === 'hearts' && <span className="text-red-500">♥ Hearts</span>}
              {game.trumpSuit === 'diamonds' && <span className="text-red-500">♦ Diamonds</span>}
              {game.trumpSuit === 'clubs' && <span className="text-white">♣ Clubs</span>}
              {game.trumpSuit === 'spades' && <span className="text-white">♠ Spades</span>}
            </span>
            {game.trumpDeclarer && (
              <span className="text-gray-400 ml-1">
                by {game.players.find(p => p.id === game.trumpDeclarer)?.name}
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default TrumpBidding;