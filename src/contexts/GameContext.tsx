import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Game, GameState, GameVariant, Card as CardType, Message } from '../types/Game';
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
  playCard: (gameId: string, userId: string, card: CardType) => Promise<void>;
  declareTrump: (gameId: string, userId: string, suit: string, length: number) => Promise<void>;
  passTrump: (gameId: string, userId: string) => Promise<void>;
  sendMessage: (gameId: string, userId: string, text: string) => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Define constants for timeouts and retries
const OPERATION_TIMEOUT = 15000; // 15 seconds
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

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
    if (!currentUser) {
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus('disconnected');

    // Set up presence channel for online users
    const setupPresence = async () => {
      try {
        // Clean up any existing channel
        if (presenceChannel.current) {
          await presenceChannel.current.unsubscribe();
          presenceChannel.current = null;
        }

        const channel = supabase.channel('lobby', {
          config: {
            presence: {
              key: currentUser.id,
            },
          },
        });
          
        channel
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

        await channel.subscribe(async (status) => {
          console.log('Presence channel status:', status);
          if (status === 'SUBSCRIBED') {
            await channel.track({
              user_id: currentUser.id,
              username: currentUser.name,
              online_at: new Date().toISOString()
            });
            setConnectionStatus('connected');
          } else {
            setConnectionStatus('disconnected');
          }
        });

        presenceChannel.current = channel;
      } catch (error) {
        console.error('Error setting up presence channel:', error);
        setConnectionStatus('disconnected');
      }
    };

    // Set up games channel for all games updates
    const setupGamesChannel = async () => {
      try {
        // Clean up any existing channel
        if (gamesChannel.current) {
          await gamesChannel.current.unsubscribe();
          gamesChannel.current = null;
        }

        const channel = supabase.channel('public:games');

        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'games'
          },
          async (payload) => {
            console.log('Games update received:', payload);
            await fetchGames();
          }
        );

        await channel.subscribe((status) => {
          console.log('Games channel status:', status);
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
          } else {
            setConnectionStatus('disconnected');
          }
        });

        gamesChannel.current = channel;
      } catch (error) {
        console.error('Error setting up games channel:', error);
      }
    };

    // Initialize
    const initialize = async () => {
      try {
        setIsLoading(true);
        await setupPresence();
        await setupGamesChannel();
        await fetchGames();
      } catch (error) {
        console.error('Error initializing game context:', error);
        setError('Failed to initialize game context');
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    // Set up auto-refresh
    autoRefreshInterval.current = setInterval(() => {
      if (connectionStatus === 'connected') {
        fetchGames();
      }
    }, 10000);

    // Initial connection timeout as fallback
    initialConnectionTimeout.current = setTimeout(() => {
      if (connectionStatus === 'disconnected') {
        console.log('Connection timeout, forcing connected status');
        setConnectionStatus('connected');
      }
    }, 5000);

    return () => {
      // Clean up resources
      const cleanup = async () => {
        if (presenceChannel.current) {
          await presenceChannel.current.unsubscribe();
          presenceChannel.current = null;
        }
        
        if (gamesChannel.current) {
          await gamesChannel.current.unsubscribe();
          gamesChannel.current = null;
        }
        
        Object.values(gameSpecificChannels.current).forEach(async (channel) => {
          await channel.unsubscribe();
        });
        gameSpecificChannels.current = {};
        
        if (autoRefreshInterval.current) {
          clearInterval(autoRefreshInterval.current);
          autoRefreshInterval.current = null;
        }
        
        if (initialConnectionTimeout.current) {
          clearTimeout(initialConnectionTimeout.current);
          initialConnectionTimeout.current = null;
        }
        
        if (operationTimeoutRef.current) {
          clearTimeout(operationTimeoutRef.current);
          operationTimeoutRef.current = null;
        }
        
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
          fetchTimeoutRef.current = null;
        }
      };
      
      cleanup();
    };
  }, [currentUser?.id]);

  // Helper function with retry logic
  const withRetry = async <T,>(operation: () => Promise<T>, retries = MAX_RETRY_ATTEMPTS): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        console.log(`Operation failed, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return withRetry(operation, retries - 1);
      }
      throw error;
    }
  };

  const createGame = async (variant: GameVariant, name: string): Promise<string> => {
    if (!currentUser) throw new Error('User must be logged in to create a game');

    return withRetry(async () => {
      try {
        setError(null);
        
        // Create game directly with SQL
        const { data, error } = await supabase
          .from('games')
          .insert({
            name,
            variant,
            state: 'waiting',
            created_by: currentUser.id
          })
          .select()
          .single();

        if (error) throw error;

        // Add creator as first player
        const { error: playerError } = await supabase
          .from('game_players')
          .insert({
            game_id: data.id,
            user_id: currentUser.id
          });

        if (playerError) throw playerError;

        // Refresh games list
        await fetchGames();
        
        return data.id;
      } catch (error) {
        console.error('Error creating game:', error);
        setError(error instanceof Error ? error.message : 'Failed to create game');
        throw error;
      }
    });
  };

  const joinGame = async (gameId: string): Promise<void> => {
    if (!currentUser) throw new Error('User must be logged in to join a game');

    return withRetry(async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if game exists
        const { data: game, error: gameError } = await supabase
          .from('games')
          .select('*, game_players(*)')
          .eq('id', gameId)
          .single();

        if (gameError) throw new Error('Game not found');

        // Check if player is already in the game
        const existingPlayer = game.game_players.find((p: any) => p.user_id === currentUser.id);
        if (existingPlayer) {
          console.log('User already in game');
          subscribeToGame(gameId);
          await fetchGames();
          return;
        }

        // Check if game is full
        const maxPlayers = game.variant === 'four-player' ? 4 : 
                           game.variant === 'three-player' ? 3 : 2;
        if (game.game_players.length >= maxPlayers) {
          throw new Error('Game is full');
        }

        // Add player to game
        const { error: joinError } = await supabase
          .from('game_players')
          .insert({
            game_id: gameId,
            user_id: currentUser.id
          });

        if (joinError) throw joinError;

        // Subscribe to game updates
        subscribeToGame(gameId);
        
        // Refresh games list
        await fetchGames();
      } catch (error) {
        console.error('Error joining game:', error);
        setError(error instanceof Error ? error.message : 'Failed to join game');
        throw error;
      } finally {
        setIsLoading(false);
      }
    });
  };

  const leaveGame = async (gameId: string): Promise<void> => {
    if (!currentUser) throw new Error('User must be logged in to leave a game');

    return withRetry(async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Remove player from game
        const { error: leaveError } = await supabase
          .from('game_players')
          .delete()
          .match({ game_id: gameId, user_id: currentUser.id });

        if (leaveError) throw leaveError;

        // Unsubscribe from game updates
        unsubscribeFromGame(gameId);
        
        // If this is the current game, clear it
        if (currentGame?.id === gameId) {
          setCurrentGame(null);
        }
        
        // Refresh games list
        await fetchGames();
      } catch (error) {
        console.error('Error leaving game:', error);
        setError(error instanceof Error ? error.message : 'Failed to leave game');
        throw error;
      } finally {
        setIsLoading(false);
      }
    });
  };

  const fetchGames = async (): Promise<void> => {
    if (!currentUser) {
      setError('User must be logged in to fetch games');
      return;
    }

    const now = Date.now();
    // Throttle fetches to at most once per second
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

    return withRetry(async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all active games
        const { data, error } = await supabase
          .from('games')
          .select(`
            *,
            game_players(
              user:users(
                id,
                name,
                avatar
              )
            ),
            game_messages(
              id,
              user:users(
                id,
                name
              ),
              text,
              created_at
            )
          `)
          .eq('deleted', false)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform the data to match the expected format
        const transformedGames: Game[] = (data || []).map((game) => {
          const players = game.game_players.map((p: any) => ({
            id: p.user.id,
            name: p.user.name,
            avatar: p.user.avatar,
            hand: [],
            tricks: []
          }));

          const messages = game.game_messages.map((m: any) => ({
            id: m.id,
            playerId: m.user.id,
            playerName: m.user.name,
            text: m.text,
            timestamp: m.created_at
          }));

          return {
            ...game,
            players,
            messages,
            score: game.score || { team1: 24, team2: 24 },
            currentTrick: game.current_trick || [],
            tricks: game.tricks || [],
            deck: game.deck || [],
            tableCards: game.table_cards || []
          };
        });

        setGames(transformedGames);
        
        // Update current game if needed
        if (currentGame) {
          const updatedCurrentGame = transformedGames.find(game => game.id === currentGame.id);
          if (updatedCurrentGame) {
            setCurrentGame(updatedCurrentGame);
          }
        }
      } catch (error) {
        console.error('Error fetching games:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch games');
      } finally {
        setIsLoading(false);
      }
    });
  };

  const subscribeToGame = (gameId: string) => {
    if (gameSpecificChannels.current[gameId]) return;

    try {
      const channel = supabase.channel(`game:${gameId}`);

      // Subscribe to changes on the games table for this specific game
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`
        },
        async (payload) => {
          console.log(`Game ${gameId} update received:`, payload);
          await fetchGames();
        }
      );

      // Subscribe to changes on the game_players table for this game
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `game_id=eq.${gameId}`
        },
        async () => {
          console.log(`Game ${gameId} players update received`);
          await fetchGames();
        }
      );

      // Subscribe to changes on the game_messages table for this game
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_messages',
          filter: `game_id=eq.${gameId}`
        },
        async () => {
          console.log(`Game ${gameId} messages update received`);
          await fetchGames();
        }
      );

      channel.subscribe((status) => {
        console.log(`Game ${gameId} subscription status:`, status);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        }
      });

      gameSpecificChannels.current[gameId] = channel;
    } catch (error) {
      console.error(`Error subscribing to game ${gameId}:`, error);
    }
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

    return withRetry(async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if user is creator or admin
        const { data: game, error: gameError } = await supabase
          .from('games')
          .select('created_by')
          .eq('id', gameId)
          .single();

        if (gameError) throw gameError;

        if (game.created_by !== currentUser.id && currentUser.role !== 'admin') {
          throw new Error('Only the game creator or an admin can delete a game');
        }

        // Soft delete the game
        const { error: deleteError } = await supabase
          .from('games')
          .update({
            deleted: true,
            deleted_at: new Date().toISOString()
          })
          .eq('id', gameId);

        if (deleteError) throw deleteError;

        // Remove the game from local state
        setGames(prev => prev.filter(g => g.id !== gameId));
        
        // If this was the current game, clear it
        if (currentGame?.id === gameId) {
          setCurrentGame(null);
        }
        
        // Unsubscribe from game updates
        unsubscribeFromGame(gameId);
      } catch (error) {
        console.error('Error deleting game:', error);
        setError(error instanceof Error ? error.message : 'Failed to delete game');
        throw error;
      } finally {
        setIsLoading(false);
      }
    });
  };

  const deleteAllGames = async (): Promise<void> => {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Only admins can delete all games');
    }

    return withRetry(async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Soft delete all games
        const { error: deleteError } = await supabase
          .from('games')
          .update({
            deleted: true,
            deleted_at: new Date().toISOString()
          })
          .eq('state', 'waiting');

        if (deleteError) throw deleteError;

        // Refresh games list
        await fetchGames();
      } catch (error) {
        console.error('Error deleting all games:', error);
        setError(error instanceof Error ? error.message : 'Failed to delete all games');
        throw error;
      } finally {
        setIsLoading(false);
      }
    });
  };

  const startGame = async (gameId: string): Promise<void> => {
    if (!currentUser) throw new Error('User must be logged in to start a game');

    return withRetry(async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if user is the creator
        const { data: game, error: gameError } = await supabase
          .from('games')
          .select('created_by, game_players(*)')
          .eq('id', gameId)
          .single();

        if (gameError) throw gameError;

        if (game.created_by !== currentUser.id) {
          throw new Error('Only the game creator can start the game');
        }

        // Check if there are enough players
        if (game.game_players.length < 2) {
          throw new Error('At least 2 players are required to start the game');
        }

        // Update game state to bidding
        const { error: updateError } = await supabase
          .from('games')
          .update({
            state: 'bidding',
            current_player_id: currentUser.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', gameId);

        if (updateError) throw updateError;

        // Refresh games list
        await fetchGames();
      } catch (error) {
        console.error('Error starting game:', error);
        setError(error instanceof Error ? error.message : 'Failed to start game');
        throw error;
      } finally {
        setIsLoading(false);
      }
    });
  };
  
  const playCard = async (gameId: string, userId: string, card: CardType): Promise<void> => {
    // This is a placeholder for card playing functionality
    // In a real implementation, this would update the game state with the played card
    console.log(`Player ${userId} played card ${card.suit} ${card.rank} in game ${gameId}`);
    
    // For now, just refresh games to update UI
    await fetchGames();
  };
  
  const declareTrump = async (gameId: string, userId: string, suit: string, length: number): Promise<void> => {
    // This is a placeholder for trump declaration functionality
    console.log(`Player ${userId} declared ${suit} as trump with length ${length} in game ${gameId}`);
    
    // For now, just refresh games to update UI
    await fetchGames();
  };
  
  const passTrump = async (gameId: string, userId: string): Promise<void> => {
    // This is a placeholder for passing trump bidding functionality
    console.log(`Player ${userId} passed on trump bidding in game ${gameId}`);
    
    // For now, just refresh games to update UI
    await fetchGames();
  };
  
  const sendMessage = async (gameId: string, userId: string, text: string): Promise<void> => {
    if (!currentUser) throw new Error('User must be logged in to send messages');

    return withRetry(async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Add message to game
        const { error: messageError } = await supabase
          .from('game_messages')
          .insert({
            game_id: gameId,
            user_id: userId,
            text: text
          });

        if (messageError) throw messageError;

        // Refresh games list
        await fetchGames();
      } catch (error) {
        console.error('Error sending message:', error);
        setError(error instanceof Error ? error.message : 'Failed to send message');
        throw error;
      } finally {
        setIsLoading(false);
      }
    });
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
    playCard,
    declareTrump,
    passTrump,
    sendMessage
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

export { GameProvider }

export { useGame }