import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Game, GameState, GameVariant } from '../types/Game';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface GameContextType {
  games: Game[];
  currentGame: Game | null;
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'connected' | 'disconnected';
  onlinePlayers: Record<string, { user_id: string; username: string; online_at: string }[]>;
  createGame: (variant: GameVariant, name: string) => Promise<string>;
  joinGame: (gameId: string) => Promise<void>;
  leaveGame: (gameId: string) => Promise<void>;
  fetchGames: () => Promise<void>;
  subscribeToGame: (gameId: string) => void;
  unsubscribeFromGame: (gameId: string) => void;
  deleteGame: (gameId: string) => Promise<void>;
  deleteAllGames: () => Promise<void>;
  startGame: (gameId: string) => Promise<void>;
  sendMessage: (gameId: string, text: string) => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

const OPERATION_TIMEOUT = 10000; // 10 seconds

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [onlinePlayers, setOnlinePlayers] = useState<Record<string, { user_id: string; username: string; online_at: string }[]>>({});
  
  const { currentUser } = useAuth();
  
  const gamesChannel = useRef<RealtimeChannel | null>(null);
  const gameSpecificChannels = useRef<Record<string, RealtimeChannel>>({});
  const presenceChannel = useRef<RealtimeChannel | null>(null);
  const lastFetchTime = useRef<number>(0);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchQueue = useRef<boolean>(false);
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  const initialConnectionTimeout = useRef<NodeJS.Timeout | null>(null);
  const operationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    setConnectionStatus('disconnected');

    initialConnectionTimeout.current = setTimeout(() => {
      setConnectionStatus('connected');
    }, 5000);

    const channel = supabase.channel('lobby')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlinePlayers(state);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('Users joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('Users left:', leftPresences);
      });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: currentUser.id,
          username: currentUser.name,
          online_at: new Date().toISOString()
        });
      }
    });

    presenceChannel.current = channel;

    autoRefreshInterval.current = setInterval(() => {
      fetchGames();
    }, 5000);

    return () => {
      if (presenceChannel.current) {
        presenceChannel.current.unsubscribe();
        presenceChannel.current = null;
      }
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
        autoRefreshInterval.current = null;
      }
      if (initialConnectionTimeout.current) {
        clearTimeout(initialConnectionTimeout.current);
        initialConnectionTimeout.current = null;
      }
    };
  }, [currentUser]);

  const createGame = async (variant: GameVariant, name: string): Promise<string> => {
    if (!currentUser) throw new Error('User must be logged in to create a game');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/game-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          userId: currentUser.id,
          name,
          variant
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to create game: ${response.statusText}`);
      }

      const game = await response.json();
      await fetchGames();
      return game.id;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create game: ${error.message}`);
      }
      throw new Error('Failed to create game: Unknown error occurred');
    }
  };

  const joinGame = async (gameId: string): Promise<void> => {
    if (!currentUser) throw new Error('User must be logged in to join a game');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/game-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'join',
          gameId,
          userId: currentUser.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to join game: ${response.statusText}`);
      }

      subscribeToGame(gameId);
      await fetchGames();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to join game: ${error.message}`);
      }
      throw new Error('Failed to join game: Unknown error occurred');
    }
  };

  const leaveGame = async (gameId: string): Promise<void> => {
    if (!currentUser) throw new Error('User must be logged in to leave a game');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/game-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'leave',
          gameId,
          userId: currentUser.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to leave game: ${response.statusText}`);
      }

      unsubscribeFromGame(gameId);
      setCurrentGame(null);
      await fetchGames();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to leave game: ${error.message}`);
      }
      throw new Error('Failed to leave game: Unknown error occurred');
    }
  };

  const fetchGames = async (): Promise<void> => {
    if (!currentUser) {
      setError('User must be logged in to fetch games');
      return;
    }

    const now = Date.now();
    if (now - lastFetchTime.current < 1000) {
      if (!fetchQueue.current) {
        fetchQueue.current = true;
        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = setTimeout(() => {
          fetchQueue.current = false;
          fetchGames();
        }, 1000);
      }
      return;
    }

    lastFetchTime.current = now;
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Authentication error: ${sessionError.message}`);
      }
      
      if (!session) {
        throw new Error('No active session found. Please log in again.');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Server configuration error: Supabase URL is not configured');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), OPERATION_TIMEOUT);

      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/game-access`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'get',
            userId: currentUser.id
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ 
            error: `Server error: ${response.status} ${response.statusText}` 
          }));
          throw new Error(errorData.error || `Failed to fetch games: ${response.statusText}`);
        }

        const games = await response.json();
        setGames(games);
        
        if (currentGame) {
          const updatedCurrentGame = games.find(game => game.id === currentGame.id);
          setCurrentGame(updatedCurrentGame || null);
        }
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new Error('Request timeout: Server took too long to respond');
          }
          throw error;
        }
        throw new Error('Network error occurred while fetching games');
      }
    } catch (error) {
      console.error('Error fetching games:', error);
      let errorMessage = 'Failed to fetch games: Unknown error occurred';
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
        } else {
          errorMessage = error.message;
        }
        console.error('Error details:', error.stack);
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToGame = (gameId: string) => {
    if (gameSpecificChannels.current[gameId]) return;

    const channel = supabase.channel(`game:${gameId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`
      }, async () => {
        await fetchGames();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('disconnected');
        }
      });

    gameSpecificChannels.current[gameId] = channel;
  };

  const unsubscribeFromGame = (gameId: string) => {
    const channel = gameSpecificChannels.current[gameId];
    if (channel) {
      channel.unsubscribe();
      delete gameSpecificChannels.current[gameId];
    }
  };

  const deleteGame = async (gameId: string): Promise<void> => {
    if (!currentUser) throw new Error('User must be logged in to delete a game');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/game-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          gameId,
          userId: currentUser.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to delete game: ${response.statusText}`);
      }

      await fetchGames();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to delete game: ${error.message}`);
      }
      throw new Error('Failed to delete game: Unknown error occurred');
    }
  };

  const deleteAllGames = async (): Promise<void> => {
    if (!currentUser) throw new Error('User must be logged in to delete games');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/game-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'deleteAll',
          userId: currentUser.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to delete all games: ${response.statusText}`);
      }

      await fetchGames();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to delete all games: ${error.message}`);
      }
      throw new Error('Failed to delete all games: Unknown error occurred');
    }
  };

  const startGame = async (gameId: string): Promise<void> => {
    if (!currentUser) throw new Error('User must be logged in to start a game');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/game-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          gameId,
          userId: currentUser.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to start game: ${response.statusText}`);
      }

      await fetchGames();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to start game: ${error.message}`);
      }
      throw new Error('Failed to start game: Unknown error occurred');
    }
  };

  const sendMessage = async (gameId: string, text: string): Promise<void> => {
    if (!currentUser) throw new Error('User must be logged in to send messages');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/game-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sendMessage',
          gameId,
          userId: currentUser.id,
          text
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to send message: ${response.statusText}`);
      }

      await fetchGames();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to send message: ${error.message}`);
      }
      throw new Error('Failed to send message: Unknown error occurred');
    }
  };

  const value = {
    games,
    currentGame,
    isLoading,
    error,
    connectionStatus,
    onlinePlayers,
    createGame,
    joinGame,
    leaveGame,
    fetchGames,
    subscribeToGame,
    unsubscribeFromGame,
    deleteGame,
    deleteAllGames,
    startGame,
    sendMessage
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

export { GameContext };