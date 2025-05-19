import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGame } from '../../contexts/GameContext';
import { GameVariant } from '../../types/Game';
import { Shield, RefreshCw, AlertTriangle, X } from 'lucide-react';

interface GameCreationFormProps {
  onClose: () => void;
  onGameCreated: (gameId: string) => void;
}

const GameCreationForm: React.FC<GameCreationFormProps> = ({ onClose, onGameCreated }) => {
  const { currentUser } = useAuth();
  const { createGame, isLoading: gameCreationLoading } = useGame();
  
  // Form state
  const [gameName, setGameName] = useState<string>('');
  const [gameVariant, setGameVariant] = useState<GameVariant>(GameVariant.FOUR_PLAYER);
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [usePassword, setUsePassword] = useState<boolean>(false);
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  
  // Validation state
  const [nameValid, setNameValid] = useState<boolean>(true);
  const [nameError, setNameError] = useState<string>('');
  const [passwordValid, setPasswordValid] = useState<boolean>(true);
  const [passwordError, setPasswordError] = useState<string>('');

  // Reset error when form fields change
  useEffect(() => {
    setError(null);
  }, [gameName, gameVariant, usePassword, password]);

  // Validate game name
  useEffect(() => {
    if (gameName.trim().length === 0) {
      setNameValid(true);
      setNameError('');
    } else if (gameName.trim().length < 3) {
      setNameValid(false);
      setNameError('Game name must be at least 3 characters');
    } else if (gameName.trim().length > 30) {
      setNameValid(false);
      setNameError('Game name must be less than 30 characters');
    } else if (!/^[a-zA-Z0-9 .'_-]+$/.test(gameName)) {
      setNameValid(false);
      setNameError('Game name contains invalid characters');
    } else {
      setNameValid(true);
      setNameError('');
    }
  }, [gameName]);

  // Validate password if password protection is enabled
  useEffect(() => {
    if (!usePassword || password.trim().length === 0) {
      setPasswordValid(true);
      setPasswordError('');
      return;
    }
    
    if (password.length < 4) {
      setPasswordValid(false);
      setPasswordError('Password must be at least 4 characters');
    } else {
      setPasswordValid(true);
      setPasswordError('');
    }
  }, [usePassword, password]);

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Pre-request validation
      if (!nameValid || (usePassword && !passwordValid)) {
        setError('Please fix the errors in the form before creating a game');
        return;
      }

      if (!currentUser?.id) {
        setError('You must be logged in to create a game');
        return;
      }

      // Environment variables validation
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.error('Missing required environment variables');
        setError('Configuration error. Please contact support.');
        return;
      }
      
      setIsSubmitting(true);
      setError(null);
      
      // Get the final game name (user input or default based on username)
      const defaultGameName = currentUser?.name ? `${currentUser.name}'s Game` : 'New Game';
      const finalGameName = gameName.trim() || defaultGameName;
      
      // Game creation options
      const gameOptions = {
        action: 'create',
        userId: currentUser.id,
        name: finalGameName,
        variant: gameVariant,
        isPrivate,
        password: usePassword ? password : undefined
      };

      // Log request details for debugging
      console.debug('Creating game with options:', {
        ...gameOptions,
        password: usePassword ? '[REDACTED]' : undefined
      });

      // Create the game using the edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/game-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(gameOptions)
      });

      // Log response details for debugging
      console.debug('Game creation response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      // Parse the response data
      let data;
      const contentType = response.headers.get('content-type');
      try {
        data = await response.text();
        if (contentType?.includes('application/json')) {
          data = JSON.parse(data);
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error(`Failed to parse server response: ${data}`);
      }

      // Handle non-200 responses
      if (!response.ok) {
        let errorMessage: string;
        
        // Try to extract error message from response
        if (data?.error?.message) {
          errorMessage = data.error.message;
        } else if (data?.error && typeof data.error === 'string') {
          errorMessage = data.error;
        } else if (data?.message) {
          errorMessage = data.message;
        } else {
          // Provide specific error messages based on status codes
          switch (response.status) {
            case 400:
              errorMessage = 'Invalid game creation request. Please check your inputs.';
              break;
            case 401:
              errorMessage = 'Authentication error. Please log in again.';
              break;
            case 403:
              errorMessage = 'You do not have permission to create games.';
              break;
            case 404:
              errorMessage = 'Game creation service is currently unavailable.';
              break;
            case 409:
              errorMessage = 'A game with this name already exists.';
              break;
            case 429:
              errorMessage = 'Too many attempts. Please wait a moment and try again.';
              break;
            case 500:
            case 502:
            case 503:
            case 504:
              errorMessage = 'Server error. Please try again later.';
              break;
            default:
              errorMessage = `Failed to create game (Status: ${response.status}). Please try again.`;
          }
        }
        
        throw new Error(errorMessage);
      }

      // Validate response data
      if (!data?.id) {
        console.error('Invalid response data:', data);
        throw new Error('Invalid response: Missing game ID');
      }
      
      // Handle success
      setSuccess(true);
      
      // Notify parent component
      setTimeout(() => {
        onGameCreated(data.id);
      }, 1000);
      
    } catch (error) {
      console.error('Game creation error:', error);
      
      let errorMessage: string;
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as { message: string }).message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = 'An unexpected error occurred while creating the game. Please try again.';
      }
      
      setError(errorMessage);
      setSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#1E293B] rounded-xl shadow-2xl overflow-hidden w-full max-w-md animate-fade-in">
      <div className="p-6 border-b border-[#334155] flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <Shield className="h-6 w-6 mr-3 text-[#D4AF37]" />
          Create New Game
        </h2>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <form onSubmit={handleCreateGame} className="p-6 space-y-6">
        {/* Error display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-lg flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        
        {/* Success message */}
        {success && (
          <div className="bg-green-500/10 border border-green-500/50 p-4 rounded-lg">
            <p className="text-green-400">
              Game created successfully! Redirecting to game...
            </p>
          </div>
        )}
        
        {/* Game name */}
        <div>
          <label className="block text-white text-sm font-medium mb-2" htmlFor="game-name">
            Game Name
          </label>
          <input
            id="game-name"
            type="text"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            placeholder={currentUser?.name ? `${currentUser.name}'s Game` : 'New Game'}
            className={`w-full px-4 py-3 bg-[#0F172A] text-white rounded-lg border ${
              !nameValid ? 'border-red-500' : 'border-[#334155]'
            } focus:outline-none focus:ring-2 focus:ring-[#D4AF37] transition-colors`}
            disabled={isSubmitting}
            aria-invalid={!nameValid}
            aria-describedby={!nameValid ? "name-error" : undefined}
          />
          {!nameValid && (
            <p id="name-error" className="mt-1 text-sm text-red-500">
              {nameError}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            Leave blank to use default name based on your username
          </p>
        </div>
        
        {/* Game variant */}
        <div>
          <label className="block text-white text-sm font-medium mb-2">
            Game Variant
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setGameVariant(GameVariant.FOUR_PLAYER)}
              className={`p-3 rounded-lg border transition-all ${
                gameVariant === GameVariant.FOUR_PLAYER
                  ? 'bg-[#1E5631] text-white border-[#2D7A47]'
                  : 'bg-[#0F172A] text-gray-300 border-[#334155] hover:bg-[#1A202C]'
              }`}
              disabled={isSubmitting}
            >
              <span className="block text-xl mb-1">4</span>
              <span className="text-xs">Players</span>
            </button>
            
            <button
              type="button"
              onClick={() => setGameVariant(GameVariant.THREE_PLAYER)}
              className={`p-3 rounded-lg border transition-all ${
                gameVariant === GameVariant.THREE_PLAYER
                  ? 'bg-[#1E5631] text-white border-[#2D7A47]'
                  : 'bg-[#0F172A] text-gray-300 border-[#334155] hover:bg-[#1A202C]'
              }`}
              disabled={isSubmitting}
            >
              <span className="block text-xl mb-1">3</span>
              <span className="text-xs">Players</span>
            </button>
            
            <button
              type="button"
              onClick={() => setGameVariant(GameVariant.TWO_PLAYER)}
              className={`p-3 rounded-lg border transition-all ${
                gameVariant === GameVariant.TWO_PLAYER
                  ? 'bg-[#1E5631] text-white border-[#2D7A47]'
                  : 'bg-[#0F172A] text-gray-300 border-[#334155] hover:bg-[#1A202C]'
              }`}
              disabled={isSubmitting}
            >
              <span className="block text-xl mb-1">2</span>
              <span className="text-xs">Players</span>
            </button>
          </div>
        </div>
        
        {/* Game privacy */}
        <div>
          <label className="block text-white text-sm font-medium mb-2">
            Game Visibility
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsPrivate(false)}
              className={`p-3 rounded-lg border transition-all ${
                !isPrivate
                  ? 'bg-[#1E5631] text-white border-[#2D7A47]'
                  : 'bg-[#0F172A] text-gray-300 border-[#334155] hover:bg-[#1A202C]'
              }`}
              disabled={isSubmitting}
            >
              <span className="text-sm">Public Game</span>
              <p className="text-xs mt-1 opacity-80">Visible in lobby</p>
            </button>
            
            <button
              type="button"
              onClick={() => setIsPrivate(true)}
              className={`p-3 rounded-lg border transition-all ${
                isPrivate
                  ? 'bg-[#1E5631] text-white border-[#2D7A47]'
                  : 'bg-[#0F172A] text-gray-300 border-[#334155] hover:bg-[#1A202C]'
              }`}
              disabled={isSubmitting}
            >
              <span className="text-sm">Private Game</span>
              <p className="text-xs mt-1 opacity-80">Invitation only</p>
            </button>
          </div>
        </div>
        
        {/* Password protection */}
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              id="password-toggle"
              type="checkbox"
              checked={usePassword}
              onChange={(e) => setUsePassword(e.target.checked)}
              className="h-4 w-4 rounded border-[#334155] bg-[#0F172A] text-[#D4AF37] focus:ring-[#D4AF37]"
              disabled={isSubmitting}
            />
            <label htmlFor="password-toggle" className="ml-2 block text-white text-sm">
              Password protect this game
            </label>
          </div>
          
          {usePassword && (
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter game password"
                className={`w-full px-4 py-3 bg-[#0F172A] text-white rounded-lg border ${
                  !passwordValid ? 'border-red-500' : 'border-[#334155]'
                } focus:outline-none focus:ring-2 focus:ring-[#D4AF37] transition-colors`}
                disabled={isSubmitting}
                aria-invalid={!passwordValid}
                aria-describedby={!passwordValid ? "password-error" : undefined}
              />
              {!passwordValid && (
                <p id="password-error" className="mt-1 text-sm text-red-500">
                  {passwordError}
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* Submit button */}
        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#334155] hover:bg-[#475569] text-white font-bold rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !nameValid || (usePassword && !passwordValid)}
            className={`flex items-center justify-center font-bold py-2 px-4 rounded-lg ${
              isSubmitting || !nameValid || (usePassword && !passwordValid)
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-[#D4AF37] hover:bg-[#E9C85D] text-[#0F172A]'
            } transition-colors`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="animate-spin h-5 w-5 mr-2" />
                Creating...
              </>
            ) : (
              'Create Game'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GameCreationForm;