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

    const newGame: Partial<Game> = {
      variant,
      name,
      created_by: currentUser.id,
      players: [currentUser.id],
      state: GameState.WAITING,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: []
    };

    const { data, error } = await supabase
      .from('games')
      .insert([newGame])
      .select()
      .single();

    if (error) throw error;
    
    await fetchGames();
    return data.id;
  };

  const joinGame = async (gameId: string): Promise<void> => {
    console.log('Joining game:', gameId);
    
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

      console.log('Retrieved game data:', game.name);
      
      const gameData = game as Game;
      
      const newPlayer = {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
        hand: [],
        tricks: [],
        currentBid: null
      };
      
      let playerExists = false;
      let updatedPlayers = [];
      
      if (gameData.players && Array.isArray(gameData.players)) {
        const existingPlayerIndex = gameData.players.findIndex(p => 
          typeof p === 'object' && p !== null && 'id' in p && p.id === currentUser.id
        );
        
        if (existingPlayerIndex >= 0) {
          console.log('Player already exists in the game, updating status');
          playerExists = true;
          
          updatedPlayers = gameData.players.map((p, index) => 
            index === existingPlayerIndex ? { ...p, left: false } : p
          );
        } else {
          updatedPlayers = [...gameData.players, newPlayer];
        }
      } else {
        updatedPlayers = [newPlayer];
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
      
      console.log('Successfully joined/updated in game');
      
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

  const leaveGame = async (gameId: string): Promise<void> => {
    if (!currentUser) throw new Error('User must be logged in to leave a game');

    try {
      setIsLoading(true);
      setError(null);

      const { data: game, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (fetchError) throw fetchError;

      const updatedPlayers = game.players.map(p => 
        p.id === currentUser.id ? { ...p, left: true } : p
      );

      const { error: updateError } = await supabase
        .from('games')
        .update({ players: updatedPlayers })
        .eq('id', gameId);

      if (updateError) throw updateError;

      unsubscribeFromGame(gameId);
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
        setCurrentGame(updatedCurrentGame || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching games');
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
    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', gameId);

    if (error) throw error;
    await fetchGames();
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

      await fetchGames();
    } catch (error) {
      console.error('Error deleting all games:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = async (gameId: string): Promise<void> => {
    const { error } = await supabase
      .from('games')
      .update({ state: GameState.IN_PROGRESS })
      .eq('id', gameId);

    if (error) throw error;
    await fetchGames();
  };

  const sendMessage = async (gameId: string, text: string): Promise<void> => {
    if (!currentUser) throw new Error('User must be logged in to send messages');

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
      .update({ messages: updatedMessages })
      .eq('id', gameId);

    if (updateError) throw updateError;
    await fetchGames();
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
    sendMessage
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