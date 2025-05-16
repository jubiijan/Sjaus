import React from 'react';
import { Card as CardType } from '../../types/Game';

interface CardProps {
  card?: CardType;
  isPlayable?: boolean;
  isFaceDown?: boolean;
  onClick?: () => void;
  className?: string;
}

const Card: React.FC<CardProps> = ({ 
  card, 
  isPlayable = false, 
  isFaceDown = false, 
  onClick, 
  className = '' 
}) => {
  if (!card) {
    return (
      <div 
        className={`w-[70px] h-[100px] bg-gray-200 bg-opacity-10 rounded-lg border border-gray-300 border-opacity-20 ${className}`}
      ></div>
    );
  }

  const getSuitColor = (suit: string): string => {
    return suit === 'hearts' || suit === 'diamonds' ? 'text-red-500' : 'text-black';
  };

  const getSuitSymbol = (suit: string): string => {
    switch (suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      default: return '';
    }
  };

  return (
    <div 
      className={`card ${isFaceDown ? 'flipped' : ''} ${className}`}
      onClick={isPlayable ? onClick : undefined}
    >
      <div className="card-inner">
        <div 
          className={`card-front w-[70px] h-[100px] rounded-lg border border-gray-300 shadow-md 
            ${isPlayable ? 'cursor-pointer hover:shadow-lg transform hover:-translate-y-1 transition-all' : ''}
            ${isPlayable ? 'ring-2 ring-green-400' : ''}
            bg-white p-2 flex flex-col justify-between`}
        >
          <div className={`text-sm font-bold ${getSuitColor(card.suit)}`}>
            {card.rank}
          </div>
          <div className={`text-center text-2xl ${getSuitColor(card.suit)}`}>
            {getSuitSymbol(card.suit)}
          </div>
          <div className={`text-sm font-bold self-end transform rotate-180 ${getSuitColor(card.suit)}`}>
            {card.rank}
          </div>
        </div>
        <div className="card-back"></div>
      </div>
    </div>
  );
};

export default Card;