import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Game, Card, GameState, GameVariant, Player } from '../types/Game';
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
  leaveGame: (gameId: string, userId?: string) => Promise<void>;
  fetchGames: () => Promise<void>;
  subscribeToGame: (gameId: string) => void;
  unsubscribeFromGame: (gameId: string) => void;
  deleteGame: (gameId: string) => Promise<void>;
  deleteAllGames: () => Promise<void>;
  startGame: (gameId: string) => Promise<void>;
  sendMessage: (gameId: string, text: string) => Promise<void>;
  playCard: (gameId: string, playerId: string, card: Card) => Promise<void>;
  declareTrump: (gameId: string, playerId: string, suit: string, length: number) => Promise<void>;
  passTrump: (gameId: string, playerId: string) => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const OPERATION_TIMEOUT = 10000; // 10 seconds
const AUTO_REFRESH_INTERVAL = 5000; // 5 seconds

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

    const channel = supabase.channel('public:games')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'games'
      }, async () => {
        await fetchGames();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to all games changes');
          setConnectionStatus('connected');
        } else {
          console.log('Games subscription status:', status);
          setConnectionStatus('disconnected');
        }
      });

    gamesChannel.current = channel;

    return () => {
      if (gamesChannel.current) {
        gamesChannel.current.unsubscribe();
        gamesChannel.current = null;
      }
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

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

    return () => {
      if (presenceChannel.current) {
        presenceChannel.current.unsubscribe();
        presenceChannel.current = null;
      }
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      fetchGames();
    }, AUTO_REFRESH_INTERVAL);

    autoRefreshInterval.current = interval;

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentUser]);

  useEffect(() => {
    return () => {
      Object.keys(gameSpecificChannels.current).forEach(gameId => {
        unsubscribeFromGame(gameId);
      });

      if (gamesChannel.current) {
        gamesChannel.current.unsubscribe();
        gamesChannel.current = null;
      }

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

      if (operationTimeoutRef.current) {
        clearTimeout(operationTimeoutRef.current);
        operationTimeoutRef.current = null;
      }
    };
  }, []);

  const createGame = async (variant: GameVariant, name: string): Promise<string> => {
    if (!currentUser) throw new Error('User must be logged in to create a game');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const newGame: Partial<Game> = {
        variant,
        name,
        created_by: currentUser.id,
        players: [currentUser.id],
        state: GameState.WAITING,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        messages: [],
        trumpSuit: null,
        trumpLength: 0,
        trumpDeclarer: null,
        currentTrick: [],
        tricks: [],
        score: { team1: 24, team2: 24 },
        currentPlayer: null,
        deck: []
      };

      const { data, error } = await supabase
        .from('games')
        .insert([newGame])
        .select()
        .single();

      if (error) throw error;
      
      setCurrentGame(data);
      subscribeToGame(data.id);
      
      await fetchGames();
      return data.id;
    } catch (error) {
      console.error('Error creating game:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to create game');
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const joinGame = async (gameId: string): Promise<void> => {
    if (!currentUser) throw new Error('User must be logged in to join a game');

    const timeoutPromise = new Promise<never>((_, reject) => {
      operationTimeoutRef.current = setTimeout(() => {
        reject(new Error('Game joining timed out'));
      }, OPERATION_TIMEOUT);
    });

    try {
      setIsLoading(true);
      setError(null);
      
      const { data: game, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (fetchError) throw fetchError;
      if (!game) throw new Error('Game not found');

      const gameData = game as Game;
      
      let updatedPlayers: string[] = [];
      
      if (Array.isArray(gameData.players)) {
        updatedPlayers = [...new Set(
          gameData.players.map(p => typeof p === 'string' ? p : p.id)
        )];
        
        if (!updatedPlayers.includes(currentUser.id)) {
          updatedPlayers.push(currentUser.id);
        }
      } else {
        updatedPlayers = [currentUser.id];
      }
      
      const updateOperation = supabase
        .from('games')
        .update({ players: updatedPlayers })
        .eq('id', gameId);
        
      const { error: updateError } = await Promise.race([updateOperation, timeoutPromise]);

      if (updateError) throw updateError;
      
      if (operationTimeoutRef.current) {
        clearTimeout(operationTimeoutRef.current);
        operationTimeoutRef.current = null;
      }
      
      subscribeToGame(gameId);
      
      setCurrentGame({
        ...gameData,
        players: updatedPlayers
      });
      
      await fetchGames();
    } catch (error) {
      console.error('Error joining game:', error);
      
      if (operationTimeoutRef.current) {
        clearTimeout(operationTimeoutRef.current);
        operationTimeoutRef.current = null;
      }
      
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

  const leaveGame = async (gameId: string, userId?: string): Promise<void> => {
    const playerId = userId || currentUser?.id;
    if (!playerId) throw new Error('User must be logged in to leave a game');

    try {
      setIsLoading(true);
      setError(null);

      const { data: game, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (fetchError) throw fetchError;

      const updatedPlayers = game.players.filter((p: string | Player) => 
        (typeof p === 'string' ? p : p.id) !== playerId
      );

      const { error: updateError } = await supabase
        .from('games')
        .update({ 
          players: updatedPlayers,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId);

      if (updateError) throw updateError;

      if (playerId === currentUser?.id) {
        unsubscribeFromGame(gameId);
        setCurrentGame(null);
      }
      
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
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setGames(data || []);
      if (currentGame) {
        const updatedCurrentGame = data.find(game => game.id === currentGame.id);
        if (updatedCurrentGame) {
          setCurrentGame(updatedCurrentGame);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching games');
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToGame = (gameId: string) => {
    if (gameSpecificChannels.current[gameId]) {
      console.log(`Already subscribed to game: ${gameId}`);
      return;
    }

    console.log(`Subscribing to game: ${gameId}`);
    
    const channel = supabase.channel(`game:${gameId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`
      }, async (payload) => {
        console.log(`Received update for game: ${gameId}`, payload);
        
        try {
          const { data, error } = await supabase
            .from('games')
            .select('*')
            .eq('id', gameId)
            .single();
            
          if (error) {
            console.error(`Error fetching game ${gameId} after update:`, error);
            return;
          }
          
          if (data) {
            if (currentGame && currentGame.id === gameId) {
              setCurrentGame(data);
            }
            
            setGames(prevGames => {
              const updatedGames = [...prevGames];
              const index = updatedGames.findIndex(g => g.id === gameId);
              if (index !== -1) {
                updatedGames[index] = data;
              }
              return updatedGames;
            });
          }
        } catch (err) {
          console.error(`Error processing game update for ${gameId}:`, err);
        }
      })
      .subscribe((status) => {
        console.log(`Subscription status for game ${gameId}:`, status);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Error subscribing to game ${gameId}`);
          setConnectionStatus('disconnected');
        }
      });

    gameSpecificChannels.current[gameId] = channel;
  };

  const unsubscribeFromGame = (gameId: string) => {
    const channel = gameSpecificChannels.current[gameId];
    if (channel) {
      console.log(`Unsubscribing from game: ${gameId}`);
      channel.unsubscribe();
      delete gameSpecificChannels.current[gameId];
    }
  };

  const deleteGame = async (gameId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', gameId);

      if (error) throw error;
      
      unsubscribeFromGame(gameId);
      
      if (currentGame && currentGame.id === gameId) {
        setCurrentGame(null);
      }
      
      await fetchGames();
    } catch (error) {
      console.error('Error deleting game:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to delete game');
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAllGames = async (): Promise<void> => {
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

      Object.keys(gameSpecificChannels.current).forEach(gameId => {
        unsubscribeFromGame(gameId);
      });
      
      setCurrentGame(null);
      
      await fetchGames();
    } catch (error) {
      console.error('Error deleting all games:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to delete all games');
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = async (gameId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('games')
        .update({ 
          state: GameState.IN_PROGRESS,
          updated_at: new Date().toISOString() 
        })
        .eq('id', gameId);

      if (error) throw error;
      
      await fetchGames();
    } catch (error) {
      console.error('Error starting game:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to start game');
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (gameId: string, text: string): Promise<void> => {
    if (!currentUser) throw new Error('User must be logged in to send messages');

    try {
      setIsLoading(true);
      setError(null);

      const { data: game, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (fetchError) throw fetchError;

      const newMessage = {
        id: crypto.randomUUID(),
        playerId: currentUser.id,
        playerName: currentUser.name,
        text,
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...(game.messages || []), newMessage];
      
      const { error: updateError } = await supabase
        .from('games')
        .update({ 
          messages: updatedMessages,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId);

      if (updateError) throw updateError;
      
      if (currentGame && currentGame.id === gameId) {
        setCurrentGame({
          ...currentGame,
          messages: updatedMessages
        });
      }
      
      await fetchGames();
    } catch (error) {
      console.error('Error sending message:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to send message');
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const playCard = async (gameId: string, playerId: string, card: Card): Promise<void> => {
    console.log("Card played", gameId, playerId, card);
  };

  const declareTrump = async (gameId: string, playerId: string, suit: string, length: number): Promise<void> => {
    console.log("Trump declared", gameId, playerId, suit, length);
  };

  const passTrump = async (gameId: string, playerId: string): Promise<void> => {
    console.log("Trump passed", gameId, playerId);
  };

  useEffect(() => {
    fetchGames();
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

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
    sendMessage,
    playCard,
    declareTrump,
    passTrump
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