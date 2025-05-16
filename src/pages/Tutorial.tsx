import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, PlayCircle } from 'lucide-react';
import Card from '../components/game/Card';

const Tutorial: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  
  const tutorialSteps = [
    {
      title: "Introduction to Sjaus",
      content: (
        <>
          <p className="mb-4">
            Sjaus (pronounced "shouse", rhyming with "house") is a traditional card game from the Faeroe Islands, belonging to the Schafkopf family of games.
          </p>
          <p className="mb-4">
            The game is played with a 32-card deck, formed by removing the 2s, 3s, 4s, 5s, and 6s from a standard 52-card pack.
          </p>
          <p>
            In its classic form, Sjaus is a 4-player partnership game, but 3-player and 2-player variants also exist and are included in this digital version.
          </p>
        </>
      )
    },
    {
      title: "Card Ranking and Values",
      content: (
        <>
          <div className="space-y-12">
            <section>
              <h3 className="text-xl font-semibold text-[#D4AF37] mb-6 text-center">
                Permanent Trump Cards (Always Trump)
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-8 mb-6">
                {[
                  { suit: 'clubs', rank: 'Q', label: '1st' },
                  { suit: 'spades', rank: 'Q', label: '2nd' },
                  { suit: 'clubs', rank: 'J', label: '3rd' },
                  { suit: 'spades', rank: 'J', label: '4th' },
                  { suit: 'hearts', rank: 'J', label: '5th' },
                  { suit: 'diamonds', rank: 'J', label: '6th' }
                ].map((card, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div className="relative mb-3">
                      <Card card={card} />
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#D4AF37] text-[#0F172A] text-xs flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                    </div>
                    <p className="text-sm text-gray-400">{card.label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-[#1E293B] rounded-lg p-6">
                <p className="text-white text-lg font-semibold mb-4">Important Rules:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-300">
                  <li>These six cards are <span className="text-[#D4AF37] font-semibold">always trump</span>, regardless of the declared trump suit</li>
                  <li>They maintain this exact ranking order in every game</li>
                  <li>They beat any other card, including cards of the declared trump suit</li>
                </ul>
              </div>
            </section>
            
            <section>
              <h3 className="text-xl font-semibold text-white mb-6 text-center">
                Regular Card Ranking (Within Each Suit)
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-8 mb-6">
                {['A', 'K', 'Q', '10', '9', '8', '7'].map((rank) => (
                  <div key={rank} className="flex flex-col items-center">
                    <Card card={{ suit: 'hearts', rank }} className="mb-3" />
                    <p className="text-sm text-gray-400">{rank}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-6 text-center">
                Card Point Values
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 mb-8">
                {[
                  { rank: 'A', points: 11 },
                  { rank: '10', points: 10 },
                  { rank: 'K', points: 4 },
                  { rank: 'Q', points: 3 },
                  { rank: 'J', points: 2 }
                ].map(({ rank, points }) => (
                  <div key={rank} className="flex flex-col items-center">
                    <Card card={{ suit: 'hearts', rank }} className="mb-3" />
                    <p className="text-sm font-semibold text-[#D4AF37]">{points} points</p>
                  </div>
                ))}
              </div>
              
              <div className="text-center text-gray-400 bg-[#1E293B] rounded-lg p-4">
                <p>Cards 7-9 are worth 0 points</p>
                <p className="mt-2 font-semibold text-white">Total points in the pack: 120</p>
              </div>
            </section>
          </div>
        </>
      )
    },
    {
      title: "Game Setup and Dealing",
      content: (
        <>
          <p className="mb-4">
            In the 4-player variant, players sit in partnerships with partners sitting across from each other.
          </p>
          
          <div className="relative w-64 h-64 mx-auto mb-6 bg-[#1E5631] rounded-full border-4 border-[#8B4513]">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-full w-12 h-12 flex items-center justify-center">
              <span className="text-white">Player 2</span>
            </div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 bg-gray-800 rounded-full w-12 h-12 flex items-center justify-center">
              <span className="text-white">Player 4</span>
            </div>
            <div className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-full w-12 h-12 flex items-center justify-center">
              <span className="text-white">Player 1</span>
            </div>
            <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-full w-12 h-12 flex items-center justify-center">
              <span className="text-white">Player 3</span>
            </div>
            
            <div className="absolute top-1/4 left-1/4 text-white">Team 1</div>
            <div className="absolute bottom-1/4 right-1/4 text-white">Team 1</div>
            <div className="absolute top-1/4 right-1/4 text-white">Team 2</div>
            <div className="absolute bottom-1/4 left-1/4 text-white">Team 2</div>
          </div>
          
          <p className="mb-4">
            Each player is dealt 8 cards in the 4-player variant. In the 3-player variant, each player gets 10 cards with 2 cards to the table. In the 2-player variant, each player gets 8 cards and there's a special layout for the remaining cards.
          </p>
        </>
      )
    },
    {
      title: "Bidding for Trump",
      content: (
        <>
          <p className="mb-4">
            Each player in turn, starting with dealer's left, must state the length of their longest potential trump suit (if 5 or more cards) or pass.
          </p>
          
          <div className="bg-[#0F172A] rounded-lg p-4 mb-6">
            <p className="font-semibold text-white mb-2">Example:</p>
            <p className="mb-2">Player 1: "Six clubs" (indicating 6 club cards)</p>
            <p className="mb-2">Player 2: "Pass" (no 5+ card suit)</p>
            <p className="mb-2">Player 3: "Seven hearts" (outbidding Player 1 with a longer suit)</p>
            <p>Player 4: "Pass"</p>
          </div>
          
          <p className="mb-4">
            A longer trump suit outbids a shorter one. Equal length in clubs outbids other suits of the same length.
          </p>
          
          <p>
            If no player can declare a 5+ card suit, the dealer deals again. Otherwise, the highest bidder's suit becomes trump for the hand.
          </p>
        </>
      )
    },
    {
      title: "Playing the Hand",
      content: (
        <>
          <p className="mb-6">
            Play proceeds clockwise, with dealer's left leading to the first trick. Players must follow suit if possible. If unable to follow suit, they may play any card.
          </p>
          
          <p className="mb-6">
            The trick is won by the highest trump, or if no trump was played, by the highest card of the led suit. The winner of each trick leads to the next.
          </p>
          
          <div className="bg-[#0F172A] rounded-lg p-6 mb-6">
            <p className="font-semibold text-white mb-6">Example Trick (Clubs are trump):</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
              <div className="flex flex-col items-center">
                <Card card={{ suit: 'hearts', rank: 'A' }} className="mb-3" />
                <p className="text-sm text-center">
                  <span className="block font-semibold">Player 1</span>
                  <span className="text-gray-400">(Lead)</span>
                </p>
              </div>
              <div className="flex flex-col items-center">
                <Card card={{ suit: 'hearts', rank: 'K' }} className="mb-3" />
                <p className="text-sm text-center">
                  <span className="block font-semibold">Player 2</span>
                </p>
              </div>
              <div className="flex flex-col items-center">
                <Card card={{ suit: 'clubs', rank: '7' }} className="mb-3" />
                <p className="text-sm text-center">
                  <span className="block font-semibold">Player 3</span>
                  <span className="text-gray-400">(Trump)</span>
                </p>
              </div>
              <div className="flex flex-col items-center">
                <Card card={{ suit: 'hearts', rank: '9' }} className="mb-3" />
                <p className="text-sm text-center">
                  <span className="block font-semibold">Player 4</span>
                </p>
              </div>
            </div>
            <p className="text-center mt-6 text-gray-400">
              Player 3 wins with the 7 of clubs (trump), even though it's the lowest card.
            </p>
          </div>
          
          <p>
            After all tricks are played, each team counts the card points in their tricks.
          </p>
        </>
      )
    },
    {
      title: "Scoring",
      content: (
        <>
          <p className="mb-6">
            Scoring depends on how many points the trump-declaring team has taken:
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div className="bg-[#0F172A] rounded-lg p-4">
              <p className="font-semibold text-white mb-2">All tricks (120 points)</p>
              <p className="text-gray-400">Score 12 (or 16 if clubs were trump)</p>
            </div>
            <div className="bg-[#0F172A] rounded-lg p-4">
              <p className="font-semibold text-white mb-2">90-120 points</p>
              <p className="text-gray-400">Score 4 (or 8 if clubs were trump)</p>
            </div>
            <div className="bg-[#0F172A] rounded-lg p-4">
              <p className="font-semibold text-white mb-2">61-89 points</p>
              <p className="text-gray-400">Score 2 (or 4 if clubs were trump)</p>
            </div>
            <div className="bg-[#0F172A] rounded-lg p-4">
              <p className="font-semibold text-white mb-2">60 points each</p>
              <p className="text-gray-400">No score, next game worth +2</p>
            </div>
            <div className="bg-[#0F172A] rounded-lg p-4">
              <p className="font-semibold text-white mb-2">31-59 points</p>
              <p className="text-gray-400">Opponents score 4 (or 8 if clubs)</p>
            </div>
            <div className="bg-[#0F172A] rounded-lg p-4">
              <p className="font-semibold text-white mb-2">0-30 points</p>
              <p className="text-gray-400">Opponents score 8 (or 16 if clubs)</p>
            </div>
          </div>
          
          <p className="mb-4">
            A rubber consists of 24 points, counted downward from 24. The first team to reach or fall below zero wins the rubber.
          </p>
        </>
      )
    },
    {
      title: "Game Variants",
      content: (
        <>
          <p className="mb-6">
            Sjaus can be played in three different configurations:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-[#0F172A] rounded-lg p-4">
              <h3 className="font-bold text-white text-lg mb-2">4-Player</h3>
              <p className="mb-2 text-gray-400">
                The classic version with two teams of two players. Partners sit opposite each other.
              </p>
              <p className="text-gray-400">
                Each player receives 8 cards. A full rubber is played to 24 points.
              </p>
            </div>
            
            <div className="bg-[#0F172A] rounded-lg p-4">
              <h3 className="font-bold text-white text-lg mb-2">3-Player</h3>
              <p className="mb-2 text-gray-400">
                One player makes trump and plays against the other two as a temporary team.
              </p>
              <p className="text-gray-400">
                Each player receives 10 cards with 2 cards face down. The trump maker can exchange cards with the face-down pile.
              </p>
            </div>
            
            <div className="bg-[#0F172A] rounded-lg p-4">
              <h3 className="font-bold text-white text-lg mb-2">2-Player</h3>
              <p className="mb-2 text-gray-400">
                Head-to-head duel with a special card layout.
              </p>
              <p className="text-gray-400">
                Each player has 4 face-down cards with 4 face-up cards on top of them, plus 8 cards in hand.
              </p>
            </div>
          </div>
          
          <p className="text-gray-400">
            In our digital version, you can select any of these variants when creating a new game.
          </p>
        </>
      )
    },
    {
      title: "Ready to Play?",
      content: (
        <>
          <p className="mb-6 text-center text-xl">
            You're now ready to play Sjaus! Join a game in the lobby or create your own.
          </p>
          
          <div className="flex justify-center">
            <Link 
              to="/lobby" 
              className="bg-[#1E5631] hover:bg-[#2D7A47] text-white font-bold py-3 px-6 rounded-lg flex items-center shadow-lg transition-all duration-200 text-lg"
            >
              <PlayCircle className="mr-2 h-5 w-5" />
              Play Now
            </Link>
          </div>
        </>
      )
    }
  ];

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const handleNextStep = () => {
    setCurrentStep(prev => Math.min(tutorialSteps.length - 1, prev + 1));
  };

  const currentTutorial = tutorialSteps[currentStep];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#0F172A] to-[#1E293B] py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#1E293B] rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-[#334155]">
            <h1 className="text-3xl font-bold text-white text-center">
              Learn to Play Sjaus
            </h1>
          </div>
          
          <div className="p-6">
            {/* Progress indicator */}
            <div className="flex items-center justify-center mb-8">
              <div className="h-2 bg-[#0F172A] rounded-full w-full max-w-md">
                <div 
                  className="h-2 bg-[#D4AF37] rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / (tutorialSteps.length - 1)) * 100}%` }}
                ></div>
              </div>
            </div>
            
            {/* Tutorial content */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                {currentTutorial.title}
              </h2>
              
              <div className="text-gray-300 leading-relaxed">
                {currentTutorial.content}
              </div>
            </div>
            
            {/* Navigation buttons */}
            <div className="flex justify-between">
              <button
                onClick={handlePrevStep}
                disabled={currentStep === 0}
                className={`flex items-center px-4 py-2 rounded-lg ${
                  currentStep === 0
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-[#334155] hover:bg-[#475569] text-white'
                }`}
              >
                <ChevronLeft className="mr-1 h-5 w-5" />
                Previous
              </button>
              
              <button
                onClick={handleNextStep}
                disabled={currentStep === tutorialSteps.length - 1}
                className={`flex items-center px-4 py-2 rounded-lg ${
                  currentStep === tutorialSteps.length - 1
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-[#D4AF37] hover:bg-[#E9C85D] text-[#0F172A]'
                }`}
              >
                Next
                <ChevronRight className="ml-1 h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;