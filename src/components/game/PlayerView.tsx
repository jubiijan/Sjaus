import React from 'react';
import Card from './Card';
import { Player, Card as CardType } from '../../types/Game';

interface PlayerViewProps {
  player: Player;
  position: string;
  isCurrentTurn: boolean;
  isSelf: boolean;
  canPlay: boolean;
  onPlayCard: (card: CardType) => void;
}

const PlayerView: React.FC<PlayerViewProps> = ({
  player,
  position,
  isCurrentTurn,
  isSelf,
  canPlay,
  onPlayCard
}) => {
  const getPositionStyles = (): React.CSSProperties => {
    switch (position) {
      case 'bottom':
        return { bottom: '10px', left: '50%', transform: 'translateX(-50%)' };
      case 'top':
        return { top: '10px', left: '50%', transform: 'translateX(-50%)' };
      case 'left':
        return { left: '10px', top: '50%', transform: 'translateY(-50%)' };
      case 'right':
        return { right: '10px', top: '50%', transform: 'translateY(-50%)' };
      case 'right-top':
        return { right: '10px', top: '30%', transform: 'translateY(-50%)' };
      case 'left-top':
        return { left: '10px', top: '30%', transform: 'translateY(-50%)' };
      default:
        return {};
    }
  };

  const getCardContainerStyles = (): React.CSSProperties => {
    const isVertical = position === 'left' || position === 'right';
    return {
      display: 'flex',
      flexDirection: isVertical ? 'column' : 'row',
      gap: '5px',
    };
  };

  return (
    <div 
      className="absolute z-10"
      style={getPositionStyles()}
    >
      <div className="flex flex-col items-center">
        {/* Player avatar and name */}
        <div className={`flex items-center ${position === 'bottom' ? 'flex-col-reverse' : 'flex-col'} mb-2`}>
          <div 
            className={`avatar w-12 h-12 ${isCurrentTurn ? 'ring-2 ring-[#D4AF37] ring-opacity-100' : ''}`}
            style={{ 
              backgroundImage: `url(${player.avatar})`,
              backgroundSize: 'cover'
            }}
          >
          </div>
          <div 
            className={`px-2 py-1 rounded-full text-xs font-semibold bg-[#1E293B] text-white shadow-md 
              ${position === 'bottom' ? 'mb-2' : 'mt-2'}`}
          >
            {player.name}
          </div>
        </div>
        
        {/* Cards */}
        <div
          className="mb-4"
          style={getCardContainerStyles()}
        >
          {player.hand.map((card, index) => (
            <Card
              key={`${card.suit}-${card.rank}-${index}`}
              card={isSelf ? card : undefined}
              isFaceDown={!isSelf}
              isPlayable={canPlay}
              onClick={() => canPlay && onPlayCard(card)}
              className={position === 'bottom' ? 'transform hover:-translate-y-2 transition-transform' : ''}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayerView;