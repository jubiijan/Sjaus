import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGame } from '../../contexts/GameContext';
import { Game, Message } from '../../types/Game';
import { MessageSquare } from 'lucide-react';

interface GameChatProps {
  game: Game;
}

const GameChat: React.FC<GameChatProps> = ({ game }) => {
  const { currentUser } = useAuth();
  const { sendMessage } = useGame();
  const [message, setMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || !message.trim()) return;
    
    sendMessage(game.id, currentUser.id, message.trim());
    setMessage('');
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && isExpanded) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [(game.messages || []).length, isExpanded]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const messages = game.messages || [];

  return (
    <div 
      className={`fixed bottom-0 right-4 bg-[#1E293B] rounded-t-lg shadow-xl transition-all duration-300 z-20
        ${isExpanded ? 'w-80 h-96' : 'w-16 h-16'}`}
    >
      {/* Chat header */}
      <div 
        className="bg-[#0F172A] p-3 rounded-t-lg cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <>
            <h3 className="text-white font-medium">Chat</h3>
            <span className="text-xs text-gray-400">{messages.length} messages</span>
          </>
        ) : (
          <div className="w-full flex justify-center">
            <MessageSquare className="text-white h-6 w-6" />
          </div>
        )}
      </div>
      
      {isExpanded && (
        <>
          {/* Messages area */}
          <div className="p-3 h-64 overflow-y-auto bg-[#1E293B]">
            {messages.length === 0 ? (
              <p className="text-gray-400 text-center text-sm italic">No messages yet</p>
            ) : (
              messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`mb-2 ${msg.playerId === currentUser?.id ? 'text-right' : 'text-left'}`}
                >
                  <div 
                    className={`inline-block rounded-lg px-3 py-2 max-w-[80%] break-words
                      ${msg.playerId === currentUser?.id 
                        ? 'bg-[#1E5631] text-white' 
                        : 'bg-[#334155] text-white'}`}
                  >
                    <p className="text-xs font-medium mb-1">
                      {msg.playerId === currentUser?.id ? 'You' : msg.playerName}
                    </p>
                    <p className="text-sm">{msg.text}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Message input */}
          <form 
            onSubmit={handleSendMessage}
            className="p-3 border-t border-[#0F172A]"
          >
            <div className="flex items-center">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-grow p-2 rounded-lg bg-[#334155] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
              <button 
                type="submit"
                className="ml-2 bg-[#D4AF37] hover:bg-[#E9C85D] text-[#0F172A] rounded-lg p-2 focus:outline-none"
                disabled={!message.trim()}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default GameChat;