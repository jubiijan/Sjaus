import React from 'react';
import Card from './Card';
import PlayerView from './PlayerView';
import { Game, Card as CardType, GameState } from '../../types/Game';
import { useAuth } from '../../contexts/AuthContext';
import { useGame } from '../../contexts/GameContext';

interface GameTableProps {
  game: Game;
}

const GameTable: React.FC<GameTableProps> = ({ game }) => {
  const { currentUser } = useAuth();
  const { playCard } = useGame();
  
  if (!currentUser) return null;
  
  const currentPlayer = game.players.find(p => p.id === currentUser.id);
  if (!currentPlayer) return null;
  
  const isPlayerTurn = game.currentPlayer === currentUser.id;
  const isPlayingPhase = game.state === GameState.PLAYING;
  
  const handlePlayCard = (card: CardType) => {
    if (isPlayerTurn && isPlayingPhase) {
      playCard(game.id, currentUser.id, card);
    }
  };
  
  // Organize players based on current user's perspective
  const getOrderedPlayers = () => {
    if (!currentUser) return [];
    
    const currentPlayerIndex = game.players.findIndex(p => p.id === currentUser.id);
    if (currentPlayerIndex === -1) return [];
    
    // Reorder players so current player is at index 0
    const orderedPlayers = [...game.players];
    const beforeCurrent = orderedPlayers.splice(0, currentPlayerIndex);
    return [...orderedPlayers, ...beforeCurrent];
  };
  
  const orderedPlayers = getOrderedPlayers();
  
  // Position players based on game variant
  const getPlayerPositions = () => {
    switch (game.variant) {
      case 'four-player':
        return [
          'bottom', // current player
          'right',  // player to the right
          'top',    // player across
          'left'    // player to the left
        ];
      case 'three-player':
        return [
          'bottom', // current player
          'right-top',  // player to the right
          'left-top'    // player to the left
        ];
      case 'two-player':
        return [
          'bottom', // current player
          'top'     // opponent
        ];
      default:
        return [];
    }
  };
  
  const positions = getPlayerPositions();
  
  return (
    <div className="game-table relative w-full h-[600px] p-4 rounded-3xl flex items-center justify-center overflow-hidden">
      {/* Center trick area */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-40 h-40">
          {(game.currentTrick || []).map((played, index) => {
            const offsetX = (index % 2) * 20 - 10;
            const offsetY = Math.floor(index / 2) * 20 - 10;
            
            return (
              <div 
                key={`trick-${index}`} 
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ 
                  left: `calc(50% + ${offsetX}px)`, 
                  top: `calc(50% + ${offsetY}px)`,
                  zIndex: index
                }}
              >
                <Card card={played.card} className="deal-animation" />
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Trump indicator */}
      {game.trumpSuit && (
        <div className="absolute top-4 left-4 bg-[#0F172A] bg-opacity-80 p-2 rounded-lg shadow-lg">
          <div className="text-sm text-white">Trump:</div>
          <div className="font-bold text-lg capitalize">
            {game.trumpSuit === 'hearts' && <span className="text-red-500">♥ Hearts</span>}
            {game.trumpSuit === 'diamonds' && <span className="text-red-500">♦ Diamonds</span>}
            {game.trumpSuit === 'clubs' && <span className="text-white">♣ Clubs</span>}
            {game.trumpSuit === 'spades' && <span className="text-white">♠ Spades</span>}
          </div>
        </div>
      )}
      
      {/* Score display */}
      <div className="absolute top-4 right-4 bg-[#0F172A] bg-opacity-80 p-2 rounded-lg shadow-lg">
        <div className="text-sm text-white">Score:</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center">
            <div className="text-xs text-gray-400">Team 1</div>
            <div className="font-bold text-lg text-white">{game.score?.team1 ?? 24}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400">Team 2</div>
            <div className="font-bold text-lg text-white">{game.score?.team2 ?? 24}</div>
          </div>
        </div>
      </div>
      
      {/* Players */}
      {orderedPlayers.map((player, index) => {
        const position = positions[index] || 'bottom';
        const isCurrentTurn = game.currentPlayer === player.id;
        
        return (
          <PlayerView 
            key={player.id}
            player={player}
            position={position}
            isCurrentTurn={isCurrentTurn}
            isSelf={player.id === currentUser.id}
            onPlayCard={handlePlayCard}
            canPlay={isPlayerTurn && isPlayingPhase && player.id === currentUser.id}
          />
        );
      })}
      
      {/* Game state message */}
      {game.state === GameState.WAITING && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-[#0F172A] bg-opacity-90 p-3 rounded-lg shadow-lg">
          <p className="text-white text-center">Waiting for players to join...</p>
        </div>
      )}
      
      {game.state === GameState.BIDDING && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-[#0F172A] bg-opacity-90 p-3 rounded-lg shadow-lg">
          <p className="text-white text-center">
            {game.currentPlayer === currentUser.id 
              ? "Your turn to bid for trump"
              : `Waiting for ${game.players.find(p => p.id === game.currentPlayer)?.name || 'player'} to bid`}
          </p>
        </div>
      )}
      
      {game.state === GameState.COMPLETE && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-[#1E293B] p-6 rounded-lg shadow-2xl text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Game Over!</h2>
            <p className="text-xl text-[#D4AF37]">
              {(game.score?.team1 ?? 24) <= 0 ? "Team 1 Wins!" : "Team 2 Wins!"}
            </p>
            <button className="mt-4 bg-[#D4AF37] hover:bg-[#E9C85D] text-[#0F172A] font-bold py-2 px-4 rounded-lg">
              Back to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameTable;