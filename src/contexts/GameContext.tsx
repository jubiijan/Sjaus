import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Game, GameState, GameVariant, Card as CardType } from '../types/Game';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface CreateGameParams {
  name: string;
  variant: GameVariant;
}

interface GameContextType {
  games: Game[];
  currentGame: Game | null;
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'connected' | 'disconnected';
  onlinePlayers: Record<string, { user_id: string; username: string; online_at: string }[]>;
  createGame: (params: CreateGameParams) => Promise<string>;
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

    channel.subscribe(async (status: string) => {
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

  const createGame = async ({ name, variant }: CreateGameParams): Promise<string> => {
    if (!currentUser) throw new Error('User must be logged in to create a game');

    try {
      setIsLoading(true);
      setError(null);

      // Create the game
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          name: name.trim(),
          variant,
          state: GameState.WAITING,
          created_by: currentUser.id
        })
        .select()
        .single();

      if (gameError) throw gameError;

      // Add creator as first player
      const { error: playerError } = await supabase
        .from('game_players')
        .insert({
          game_id: game.id,
          user_id: currentUser.id,
          hand: '[]',
          tricks: '[]',
          has_left: false
        });

      if (playerError) throw playerError;

      await fetchGames();
      return game.id;
    } catch (error) {
      console.error('Error creating game:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const joinGame = async (gameId: string): Promise<void> => {
    if (!currentUser) throw new Error('User must be logged in to join a game');

    try {
      setIsLoading(true);
      setError(null);

      // Check if game exists and is in waiting state
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*, game_players(*)')
        .eq('id', gameId)
        .single();

      if (gameError) throw new Error('Game not found');
      if (game.state !== GameState.WAITING) throw new Error('Game is not accepting new players');

      // Check if player is already in the game
      const existingPlayer = game.game_players.find((p: any) => p.user_id === currentUser.id);
      if (existingPlayer) {
        subscribeToGame(gameId);
        await fetchGames();
        return;
      }

      // Check if game is full
      const maxPlayers = game.variant === GameVariant.FOUR_PLAYER ? 4 : 
                        game.variant === GameVariant.THREE_PLAYER ? 3 : 2;
      if (game.game_players.length >= maxPlayers) {
        throw new Error('Game is full');
      }

      // Add player to game
      const { error: joinError } = await supabase
        .from('game_players')
        .insert({
          game_id: gameId,
          user_id: currentUser.id,
          hand: '[]',
          tricks: '[]',
          has_left: false
        });

      if (joinError) throw joinError;

      subscribeToGame(gameId);
      await fetchGames();
    } catch (error) {
      console.error('Error joining game:', error);
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

      const { error: leaveError } = await supabase
        .from('game_players')
        .delete()
        .match({ game_id: gameId, user_id: currentUser.id });

      if (leaveError) throw leaveError;

      unsubscribeFromGame(gameId);
      if (currentGame?.id === gameId) {
        setCurrentGame(null);
      }
      await fetchGames();
    } catch (error) {
      console.error('Error leaving game:', error);
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
      .subscribe((status: string) => {
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
      .update({ 
        deleted: true,
        deleted_at: new Date().toISOString(),
        state: GameState.COMPLETE
      })
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
        .eq('state', GameState.WAITING);

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
      .update({ state: GameState.BIDDING })
      .eq('id', gameId);

    if (error) throw error;
    await fetchGames();
  };

  const playCard = async (gameId: string, userId: string, card: CardType): Promise<void> => {
    console.log(`Player ${userId} played card ${card.suit} ${card.rank} in game ${gameId}`);
    await fetchGames();
  };

  const declareTrump = async (gameId: string, userId: string, suit: string, length: number): Promise<void> => {
    console.log(`Player ${userId} declared ${suit} as trump with length ${length} in game ${gameId}`);
    await fetchGames();
  };

  const passTrump = async (gameId: string, userId: string): Promise<void> => {
    console.log(`Player ${userId} passed on trump bidding in game ${gameId}`);
    await fetchGames();
  };

  const sendMessage = async (gameId: string, userId: string, text: string): Promise<void> => {
    if (!currentUser) throw new Error('User must be logged in to send messages');

    try {
      setIsLoading(true);
      setError(null);

      const { error: messageError } = await supabase
        .from('game_messages')
        .insert({
          game_id: gameId,
          user_id: userId,
          text: text
        });

      if (messageError) throw messageError;

      await fetchGames();
    } catch (error) {
      console.error('Error sending message:', error);
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