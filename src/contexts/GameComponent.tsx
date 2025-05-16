import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';
import { GameState } from '../types/Game';

const GameComponent: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { 
    games, 
    isLoading, 
    error, 
    leaveGame, 
    startGame, 
    sendMessage,
    subscribeToGame,
    unsubscribeFromGame,
    connectionStatus 
  } = useGame();
  const { currentUser } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Find current game
  const game = gameId ? games.find(g => g.id === gameId) : null;
  
  // Subscribe to specific game updates
  useEffect(() => {
    if (gameId && currentUser) {
      // Set up game-specific subscription
      subscribeToGame(gameId);
      
      return () => {
        // Clean up subscription when leaving
        unsubscribeFromGame(gameId);
      };
    }
  }, [gameId, currentUser?.id]);

  // Scroll to bottom of messages whenever messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [game?.messages]);

  if (isLoading) {
    return <div className="loading">Loading game...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!game) {
    return <div className="game-not-found">Game not found. Return to <button onClick={() => navigate('/lobby')}>Lobby</button></div>;
  }

  if (!currentUser) {
    return <div className="not-logged-in">Please log in to view this game.</div>;
  }

  const currentPlayer = game.players.find(p => p.id === currentUser.id);
  
  if (!currentPlayer) {
    return (
      <div className="not-in-game">
        <p>You are not part of this game.</p>
        <button onClick={() => navigate('/lobby')}>Return to Lobby</button>
      </div>
    );
  }

  const handleLeaveGame = async () => {
    if (!gameId) return;
    
    try {
      setIsLeaving(true);
      await leaveGame(gameId, currentUser.id);
      navigate('/lobby');
    } catch (error) {
      console.error('Error leaving game:', error);
    } finally {
      setIsLeaving(false);
    }
  };

  const handleStartGame = async () => {
    if (!gameId) return;
    
    try {
      await startGame(gameId);
    } catch (error) {
      console.error('Error starting game:', error);
    }
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!gameId || !messageText.trim()) return;
    
    try {
      setIsSending(true);
      await sendMessage(gameId, currentUser.id, messageText.trim());
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const activePlayers = game.players.filter(p => !p.left);
  const maxPlayers = game.variant === 'four-player' ? 4 : 
                    game.variant === 'three-player' ? 3 : 2;
  const isCreator = game.players[0]?.id === currentUser.id;
  const canStartGame = game.state === 'waiting' && isCreator && activePlayers.length >= 2;

  return (
    <div className="game-container">
      <div className="connection-status">
        Status: <span className={connectionStatus === 'connected' ? 'text-green-500' : 'text-red-500'}>
          {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      
      <div className="game-header">
        <h1>{game.name}</h1>
        <div className="game-details">
          <p>Type: {game.variant}</p>
          <p>Status: {game.state}</p>
          <p>Players: {activePlayers.length}/{maxPlayers}</p>
        </div>
      </div>
      
      {game.state === 'waiting' && (
        <div className="waiting-room">
          <h2>Waiting for Players</h2>
          <div className="players-list">
            {game.players.map(player => (
              <div key={player.id} className={`player-card ${player.left ? 'left' : ''}`}>
                <img src={player.avatar} alt={player.name} className="player-avatar" />
                <div className="player-info">
                  <p className="player-name">{player.name}</p>
                  <p className="player-status">
                    {player.left ? 'Left' : 'Ready'}
                    {player.id === game.players[0]?.id && ' (Creator)'}
                  </p>
                </div>
              </div>
            ))}
            
            {/* Placeholder for empty spots */}
            {Array.from({ length: maxPlayers - activePlayers.length }, (_, i) => (
              <div key={`empty-${i}`} className="player-card empty">
                <div className="player-info">
                  <p className="player-name">Waiting for player...</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="game-actions">
            {canStartGame && (
              <button onClick={handleStartGame} className="btn btn-success">
                Start Game
              </button>
            )}
            
            <button 
              onClick={handleLeaveGame} 
              className="btn btn-danger"
              disabled={isLeaving}
            >
              {isLeaving ? 'Leaving...' : 'Leave Game'}
            </button>
          </div>
          
          {!canStartGame && isCreator && activePlayers.length < 2 && (
            <p className="hint">Need at least 2 players to start the game.</p>
          )}
        </div>
      )}
      
      {game.state === 'playing' && (
        <div className="game-board">
          {/* Game UI would go here */}
          <p>Game is in progress. Game UI not implemented in this example.</p>
          
          <button 
            onClick={handleLeaveGame} 
            className="btn btn-danger"
            disabled={isLeaving}
          >
            {isLeaving ? 'Leaving...' : 'Leave Game'}
          </button>
        </div>
      )}
      
      <div className="game-chat">
        <h3>Game Chat</h3>
        <div className="messages-container">
          {game.messages.length === 0 ? (
            <p className="no-messages">No messages yet.</p>
          ) : (
            <div className="messages-list">
              {game.messages.map(message => (
                <div 
                  key={message.id} 
                  className={`message ${message.playerId === currentUser.id ? 'my-message' : ''}`}
                >
                  <span className="message-sender">{message.playerName}:</span>
                  <span className="message-text">{message.text}</span>
                  <span className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        <form onSubmit={handleSendMessage} className="message-form">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            className="message-input"
            disabled={isSending}
          />
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={!messageText.trim() || isSending}
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GameComponent;