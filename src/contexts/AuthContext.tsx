import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Game, GameState, GameVariant, Player } from '../types/Game';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface GameContextType {
  games: Game[];
  currentGame: Game | null;
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  onlinePlayers: Record<string, { user_id: string; username: string; online_at: string }[]>;
  createGame: (variant: GameVariant, name: string) => Promise<string>;
  joinGame: (gameId: string) => Promise<void>;
  leaveGame: (gameId: string) => Promise<void>;
  fetchGames: () => Promise<void>;
  fetchGameById: (gameId: string) => Promise<Game | null>;
  subscribeToGame: (gameId: string) => void;
  unsubscribeFromGame: (gameId: string) => void;
  deleteGame: (gameId: string) => Promise<void>;
  deleteAllGames: () => Promise<void>;
  startGame: (gameId: string) => Promise<void>;
  sendMessage: (gameId: string, playerId: string, text: string) => Promise<void>;
  reconnect: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Operation timeout constant
const OPERATION_TIMEOUT = 20000; // 20 seconds

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [onlinePlayers, setOnlinePlayers] = useState<Record<string, { user_id: string; username: string; online_at: string }[]>>({});
  
  const { currentUser } = useContext(AuthContext);
  
  const gamesChannel = useRef<RealtimeChannel | null>(null);
  const gameSpecificChannels = useRef<Record<string, RealtimeChannel>>({});
  const presenceChannel = useRef<RealtimeChannel | null>(null);
  const lastFetchTime = useRef<number>(0);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchQueue = useRef<boolean>(false);
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  const connectionCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const operationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef<number>(0);

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      if (autoRefreshInterval.current) clearInterval(autoRefreshInterval.current);
      if (connectionCheckInterval.current) clearInterval(connectionCheckInterval.current);
      if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    // Set initial connection status
    setConnectionStatus('connecting');
    console.log('Initializing game connection');

    // Initialize realtime connection
    initializeRealtimeConnection();

    // Set up connection check interval
    connectionCheckInterval.current = setInterval(() => {
      checkConnectionStatus();
    }, 15000); // Check every 15 seconds

    // Set up auto-refresh for games
    autoRefreshInterval.current = setInterval(() => {
      if (connectionStatus === 'connected') {
        fetchGames().catch(err => {
          console.error('Auto-refresh error:', err);
        });
      }
    }, 10000); // Refresh every 10 seconds when connected

    // Initial games fetch
    fetchGames().catch(err => {
      console.error('Initial games fetch error:', err);
    });

    return () => {
      // Clean up realtime connections
      cleanupRealtimeConnection();
      
      // Clean up intervals
      if (connectionCheckInterval.current) {
        clearInterval(connectionCheckInterval.current);
        connectionCheckInterval.current = null;
      }
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
        autoRefreshInterval.current = null;
      }
    };
  }, [currentUser]);

  const initializeRealtimeConnection = () => {
    if (!currentUser) return;

    try {
      console.log('Setting up realtime connection');
      
      // Set up presence channel for online players
      const channel = supabase.channel('lobby')
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          setOnlinePlayers(state);
          console.log('Presence synced, online players:', Object.keys(state).length);
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          console.log('Users joined:', newPresences.length);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          console.log('Users left:', leftPresences.length);
        });

      channel.subscribe(async (status) => {
        console.log('Lobby channel status:', status);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          reconnectAttempts.current = 0;
          
          await channel.track({
            user_id: currentUser.id,
            username: currentUser.name,
            online_at: new Date().toISOString()
          });
          
          console.log('Successfully tracked user presence');
        } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
          console.error('Channel subscription failed:', status);
        }
      });

      presenceChannel.current = channel;
      
      // Set up games channel for global game updates
      const gamesChannelInstance = supabase.channel('games-global')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'games'
        }, async (payload) => {
          console.log('Game change detected:', payload.eventType);
          await fetchGames();
        })
        .subscribe((status) => {
          console.log('Games channel status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to games updates');
          }
        });
        
      gamesChannel.current = gamesChannelInstance;
      
    } catch (error) {
      console.error('Error setting up realtime connection:', error);
      setConnectionStatus('disconnected');
    }
  };

  const cleanupRealtimeConnection = () => {
    console.log('Cleaning up realtime connections');
    
    // Unsubscribe from presence channel
    if (presenceChannel.current) {
      presenceChannel.current.unsubscribe();
      presenceChannel.current = null;
    }
    
    // Unsubscribe from games channel
    if (gamesChannel.current) {
      gamesChannel.current.unsubscribe();
      gamesChannel.current = null;
    }
    
    // Unsubscribe from game-specific channels
    Object.values(gameSpecificChannels.current).forEach(channel => {
      channel.unsubscribe();
    });
    gameSpecificChannels.current = {};
  };

  const checkConnectionStatus = async () => {
    // If we're already marked as connected, check if channels are actually working
    if (connectionStatus === 'connected') {
      const presenceState = presenceChannel.current?.presenceState();
      
      // If we can't get presence state, we might be disconnected
      if (!presenceState || Object.keys(presenceState).length === 0) {
        console.log('Connection check failed, marking as disconnected');
        setConnectionStatus('disconnected');
        
        // Try to reconnect automatically
        await reconnect();
      }
    } else if (connectionStatus === 'disconnected') {
      // If we're disconnected, try to reconnect automatically
      await reconnect();
    }
  };

  const reconnect = async () => {
    if (reconnectAttempts.current >= 5) {
      console.log('Max reconnection attempts reached, waiting for user interaction');
      return;
    }
    
    reconnectAttempts.current++;
    console.log(`Reconnection attempt ${reconnectAttempts.current}/5`);
    
    try {
      setConnectionStatus('connecting');
      
      // Clean up existing connections
      cleanupRealtimeConnection();
      
      // Wait a moment before reconnecting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Set up connections again
      initializeRealtimeConnection();
      
      // Refresh games
      await fetchGames();
      
      console.log('Reconnection successful');
    } catch (error) {
      console.error('Reconnection failed:', error);
      setConnectionStatus('disconnected');
    }
  };

  const createGame = async (variant: GameVariant, name: string): Promise<string> => {
    console.log('Creating game:', name, variant);
    
    if (!currentUser) throw new Error('User must be logged in to create a game');

    // Set up operation timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      operationTimeoutRef.current = setTimeout(() => {
        reject(new Error('Game creation timed out'));
      }, OPERATION_TIMEOUT);
    });

    try {
      setIsLoading(true);
      setError(null);
      
      // Prepare a player object for the current user
      const currentPlayer: Player = {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
        hand: [],
        tricks: [],
        currentBid: null
      };

      const newGame: Partial<Game> = {
        variant,
        name,
        created_by: currentUser.id,
        players: [currentPlayer],
        state: GameState.WAITING,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        messages: [],
        currentTrick: [],
        tricks: [],
        trumpSuit: null,
        trumpDeclarer: null,
        trumpLength: 0,
        score: { team1: 24, team2: 24 }
      };

      // Race the creation operation against timeout
      const gameOperation = supabase
        .from('games')
        .insert([newGame])
        .select()
        .single();
        
      const { data, error } = await Promise.race([gameOperation, timeoutPromise]);

      if (error) throw error;
      if (!data) throw new Error('No data returned from game creation');
      
      // Clear timeout
      if (operationTimeoutRef.current) {
        clearTimeout(operationTimeoutRef.current);
        operationTimeoutRef.current = null;
      }
      
      console.log('Game created successfully:', data.id);
      await fetchGames();
      return data.id;
    } catch (error) {
      console.error('Error creating game:', error);
      
      // Clear timeout
      if (operationTimeoutRef.current) {
        clearTimeout(operationTimeoutRef.current);
        operationTimeoutRef.current = null;
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const joinGame = async (gameId: string): Promise<void> => {
    console.log('Joining game:', gameId);
    
    if (!currentUser) throw new Error('User must be logged in to join a game');

    // Set up operation timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      operationTimeoutRef.current = setTimeout(() => {
        reject(new Error('Game joining timed out'));
      }, OPERATION_TIMEOUT);
    });

    try {
      setIsLoading(true);
      setError(null);
      
      // First, get the current game data
      const { data: game, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (fetchError) throw fetchError;
      if (!game) throw new Error('Game not found');

      console.log('Retrieved game data:', game.name);
      
      // Parse the game data
      const gameData = game as Game;
      
      // Check if player is already in the game
      if (gameData.players && Array.isArray(gameData.players)) {
        const existingPlayer = gameData.players.find(p => p.id === currentUser.id);
        
        if (existingPlayer) {
          console.log('Player already in game, no need to join');
          // If the player had left, mark them as rejoined
          if (existingPlayer.left) {
            const updatedPlayers = gameData.players.map(p => 
              p.id === currentUser.id ? { ...p, left: false } : p
            );
            
            const { error: updateError } = await supabase
              .from('games')
              .update({ players: updatedPlayers })
              .eq('id', gameId);
              
            if (updateError) throw updateError;
          }
          
          // Subscribe to this specific game
          subscribeToGame(gameId);
          
          // Clear timeout
          if (operationTimeoutRef.current) {
            clearTimeout(operationTimeoutRef.current);
            operationTimeoutRef.current = null;
          }
          
          console.log('Successfully rejoined game');
          await fetchGames();
          return;
        }
      }
      
      // Create a player object for the current user
      const newPlayer: Player = {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
        hand: [],
        tricks: [],
        currentBid: null
      };
      
      // Add the player to the game
      const updatedPlayers = [...(gameData.players || []), newPlayer];
      
      // Race the update operation against timeout
      const updateOperation = supabase
        .from('games')
        .update({ players: updatedPlayers })
        .eq('id', gameId);
        
      const { error: updateError } = await Promise.race([updateOperation, timeoutPromise]);

      if (updateError) throw updateError;
      
      // Clear timeout
      if (operationTimeoutRef.current) {
        clearTimeout(operationTimeoutRef.current);
        operationTimeoutRef.current = null;
      }
      
      // Subscribe to this specific game
      subscribeToGame(gameId);
      
      console.log('Successfully joined game');
      setCurrentGame(gameData);
      await fetchGames();
    } catch (error) {
      console.error('Error joining game:', error);
      
      // Clear timeout
      if (operationTimeoutRef.current) {
        clearTimeout(operationTimeoutRef.current);
        operationTimeoutRef.current = null;
      }
      
      // Provide a more user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('timed out')) {
          setError('Joining the game is taking longer than expected. Please try again.');
        } else if (error.message.includes('not found')) {
          setError('The game you tried to join no longer exists.');
        } else {
          setError('Failed to join game. Please try again.');
        }
      } else {
        setError('Failed to join game. Please try again.');
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const leaveGame = async (gameId: string): Promise<void> => {
    console.log('Leaving game:', gameId);
    
    if (!currentUser) throw new Error('User must be logged in to leave a game');

    try {
      setIsLoading(true);
      setError(null);

      // Get current game data
      const { data: game, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (fetchError) throw fetchError;
      if (!game) throw new Error('Game not found');
      
      const gameData = game as Game;
      
      // Update player status to 'left'
      if (gameData.players && Array.isArray(gameData.players)) {
        const updatedPlayers = gameData.players.map(player => 
          player.id === currentUser.id ? { ...player, left: true } : player
        );
        
        const { error: updateError } = await supabase
          .from('games')
          .update({ players: updatedPlayers })
          .eq('id', gameId);

        if (updateError) throw updateError;
      }
      
      // Unsubscribe from the game
      unsubscribeFromGame(gameId);
      
      console.log('Successfully left game');
      setCurrentGame(null);
      await fetchGames();
    } catch (error) {
      console.error('Error leaving game:', error);
      setError('Failed to leave game. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGames = async (): Promise<void> => {
    // Throttle fetches to once per second
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
    
    try {
      console.log('Fetching games');
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        console.log(`Retrieved ${data.length} games`);
        setGames(data);
        
        // Update current game if it exists
        if (currentGame) {
          const updatedCurrentGame = data.find(game => game.id === currentGame.id);
          if (updatedCurrentGame) {
            console.log('Updating current game data');
            setCurrentGame(updatedCurrentGame);
          } else {
            console.log('Current game no longer exists');
            setCurrentGame(null);
          }
        }
      } else {
        console.log('No games found');
        setGames([]);
      }
    } catch (error) {
      console.error('Error fetching games:', error);
      setError('Failed to fetch games. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGameById = async (gameId: string): Promise<Game | null> => {
    console.log('Fetching specific game:', gameId);
    
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error) {
        console.error('Error fetching game by ID:', error);
        return null;
      }
      
      if (!data) {
        console.log('Game not found');
        return null;
      }
      
      console.log('Retrieved game data:', data.name);
      return data as Game;
    } catch (error) {
      console.error('Error in fetchGameById:', error);
      return null;
    }
  };

  const subscribeToGame = (gameId: string) => {
    if (gameSpecificChannels.current[gameId]) {
      console.log('Already subscribed to game:', gameId);
      return;
    }

    console.log('Subscribing to game updates:', gameId);
    
    const channel = supabase.channel(`game:${gameId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`
      }, async (payload) => {
        console.log('Game update received:', payload.eventType);
        
        // Refresh current game and games list
        if (payload.new.id === gameId) {
          setCurrentGame(payload.new as Game);
        }
        await fetchGames();
      })
      .subscribe((status) => {
        console.log(`Game ${gameId} subscription status:`, status);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
        }
      });

    gameSpecificChannels.current[gameId] = channel;
  };

  const unsubscribeFromGame = (gameId: string) => {
    const channel = gameSpecificChannels.current[gameId];
    if (channel) {
      console.log('Unsubscribing from game:', gameId);
      channel.unsubscribe();
      delete gameSpecificChannels.current[gameId];
    }
  };

  const deleteGame = async (gameId: string): Promise<void> => {
    console.log('Deleting game:', gameId);
    
    try {
      setIsLoading(true);
      setError(null);

      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', gameId);

      if (error) throw error;
      
      // If this was the current game, clear it
      if (currentGame?.id === gameId) {
        setCurrentGame(null);
      }
      
      // Unsubscribe from the game channel
      unsubscribeFromGame(gameId);
      
      console.log('Game deleted successfully');
      await fetchGames();
    } catch (error) {
      console.error('Error deleting game:', error);
      setError('Failed to delete game. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAllGames = async (): Promise<void> => {
    console.log('Deleting all waiting games');
    
    try {
      setIsLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('games')
        .update({ 
          deleted: true,
          deleted_at: new Date().toISOString(),
          state: GameState.COMPLETE
        })
        .eq('state', 'waiting');

      if (updateError) throw updateError;
      
      console.log('All waiting games deleted');
      await fetchGames();
    } catch (error) {
      console.error('Error deleting all games:', error);
      setError('Failed to delete all games. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = async (gameId: string): Promise<void> => {
    console.log('Starting game:', gameId);
    
    try {
      setIsLoading(true);
      setError(null);

      const { error } = await supabase
        .from('games')
        .update({ state: GameState.IN_PROGRESS })
        .eq('id', gameId);

      if (error) throw error;
      
      console.log('Game started successfully');
      await fetchGames();
    } catch (error) {
      console.error('Error starting game:', error);
      setError('Failed to start game. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (gameId: string, playerId: string, text: string): Promise<void> => {
    console.log('Sending message in game:', gameId);
    
    try {
      setIsLoading(true);
      setError(null);

      // Get the current game
      const { data: game, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (fetchError) throw fetchError;
      if (!game) throw new Error('Game not found');
      
      // Find player name
      const playerName = game.players.find(p => p.id === playerId)?.name || 'Unknown Player';
      
      // Create new message
      const newMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        playerId,
        playerName,
        text,
        timestamp: new Date().toISOString()
      };

      // Update messages
      const updatedMessages = [...(game.messages || []), newMessage];
      
      // Update the game
      const { error: updateError } = await supabase
        .from('games')
        .update({ messages: updatedMessages })
        .eq('id', gameId);

      if (updateError) throw updateError;
      
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
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
    fetchGameById,
    subscribeToGame,
    unsubscribeFromGame,
    deleteGame,
    deleteAllGames,
    startGame,
    sendMessage,
    reconnect
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

// Create and export the AuthContext
interface AuthContextType {
  currentUser: {
    id: string;
    name: string;
    avatar?: string;
  } | null;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null
});

export const useAuth = () => {
  return useContext(AuthContext);
};