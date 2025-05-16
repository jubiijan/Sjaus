import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Game, GameState, GameVariant } from '../types/Game';
import { supabase } from '../lib/supabase';
import { AuthContext } from './AuthContext';

interface GameContextType {
  games: Game[];
  currentGame: Game | null;
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'connected' | 'disconnected';
  createGame: (variant: GameVariant, name: string) => Promise<string>;
  joinGame: (gameId: string, playerId: string) => Promise<void>;
  leaveGame: (gameId: string, playerId: string) => Promise<void>;
  fetchGames: () => Promise<void>;
  deleteGame: (gameId: string) => Promise<void>;
  deleteAllGames: () => Promise<void>;
  startGame: (gameId: string) => Promise<void>;
  sendMessage: (gameId: string, playerId: string, text: string) => Promise<void>;
  subscribeToGame: (gameId: string) => void;
  unsubscribeFromGame: (gameId: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('connected');
  const { currentUser } = useContext(AuthContext);

  // Keep track of active subscriptions
  const subscriptions = useRef<Record<string, { channel: any; status: 'connected' | 'disconnected' }>>({});
  const lastFetchTime = useRef<number>(0);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update overall connection status based on all subscriptions
  const updateConnectionStatus = () => {
    const hasActiveSubscription = Object.values(subscriptions.current).some(
      sub => sub.status === 'connected'
    );
    setConnectionStatus(hasActiveSubscription ? 'connected' : 'disconnected');
  };

  // Debounced fetch to prevent multiple rapid fetches
  const debouncedFetch = () => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime.current;
    
    if (timeSinceLastFetch < 1000) {
      fetchTimeoutRef.current = setTimeout(() => {
        fetchGames();
      }, 1000 - timeSinceLastFetch);
      return;
    }
    
    fetchGames();
  };

  const fetchGames = async () => {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }

      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('games')
        .select(`
          *,
          game_players!inner (
            user_id,
            team,
            hand,
            tricks,
            current_bid,
            has_left,
            users (
              id,
              name,
              avatar
            )
          ),
          game_messages (
            id,
            user_id,
            text,
            created_at,
            users (
              id,
              name
            )
          )
        `)
        .eq('deleted', false)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const transformedGames = data?.map(game => ({
        ...game,
        players: game.game_players.map(player => ({
          id: player.user_id,
          name: player.users.name,
          avatar: player.users.avatar,
          team: player.team,
          hand: player.hand || [],
          tricks: player.tricks || [],
          currentBid: player.current_bid,
          left: player.has_left
        })),
        messages: game.game_messages.map(message => ({
          id: message.id,
          playerId: message.user_id,
          playerName: message.users.name,
          text: message.text,
          timestamp: message.created_at
        }))
      })) || [];

      setGames(transformedGames);
      lastFetchTime.current = Date.now();
      setError(null);
    } catch (error) {
      console.error('Error fetching games:', error);
      setError('Failed to load games. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToGame = (gameId: string) => {
    if (!supabase || subscriptions.current[gameId]) return;

    const channel = supabase.channel(`game:${gameId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        () => debouncedFetch()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` },
        () => debouncedFetch()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_messages', filter: `game_id=eq.${gameId}` },
        () => debouncedFetch()
      )
      .subscribe(status => {
        console.log(`Game ${gameId} subscription status:`, status);
        
        subscriptions.current[gameId] = {
          channel,
          status: status === 'SUBSCRIBED' ? 'connected' : 'disconnected'
        };
        updateConnectionStatus();

        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.log(`Game ${gameId} subscription closed or errored, retrying in 5s...`);
          setTimeout(() => {
            if (subscriptions.current[gameId]) {
              subscriptions.current[gameId].channel.unsubscribe();
              delete subscriptions.current[gameId];
              subscribeToGame(gameId);
            }
          }, 5000);
        }
      });
  };

  const unsubscribeFromGame = (gameId: string) => {
    const subscription = subscriptions.current[gameId];
    if (!subscription) return;

    subscription.channel.unsubscribe();
    delete subscriptions.current[gameId];
    updateConnectionStatus();
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchGames();
    } else {
      setGames([]);
      setCurrentGame(null);
      setIsLoading(false);
    }

    return () => {
      // Clean up all subscriptions
      Object.entries(subscriptions.current).forEach(([gameId, subscription]) => {
        subscription.channel.unsubscribe();
        delete subscriptions.current[gameId];
      });
      
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [currentUser?.id]);

  const createGame = async (variant: GameVariant, name: string): Promise<string> => {
    if (!currentUser) throw new Error('No user logged in');
    if (!supabase) throw new Error('Supabase client is not initialized');

    try {
      setIsLoading(true);
      setError(null);
      
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          name,
          variant,
          state: GameState.WAITING,
          score_team1: 24,
          score_team2: 24,
          deleted: false
        })
        .select()
        .single();

      if (gameError) throw gameError;
      if (!game) throw new Error('Failed to create game');

      const { error: playerError } = await supabase
        .from('game_players')
        .insert({
          game_id: game.id,
          user_id: currentUser.id,
          team: 1,
          hand: [],
          tricks: [],
          has_left: false
        });

      if (playerError) throw playerError;

      await fetchGames();
      return game.id;
    } catch (error) {
      console.error('Error creating game:', error);
      setError('Failed to create game. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const joinGame = async (gameId: string, playerId: string) => {
    if (!currentUser) throw new Error('No user logged in');
    if (!supabase) throw new Error('Supabase client is not initialized');
    if (!gameId) throw new Error('Game ID is required');
    if (!playerId) throw new Error('Player ID is required');

    try {
      setIsLoading(true);
      setError(null);

      const game = games.find(g => g.id === gameId);
      if (!game) throw new Error('Game not found');

      const maxPlayers = game.variant === 'four-player' ? 4 : game.variant === 'three-player' ? 3 : 2;
      const activePlayers = game.players.filter(p => !p.left).length;

      if (activePlayers >= maxPlayers) {
        throw new Error('Game is full');
      }

      const { data: existingPlayers, error: existingPlayerError } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', playerId);

      if (existingPlayerError) throw existingPlayerError;

      if (existingPlayers && existingPlayers.length > 0) {
        const existingPlayer = existingPlayers[0];
        if (existingPlayer.has_left) {
          const { error: updateError } = await supabase
            .from('game_players')
            .update({ has_left: false })
            .eq('game_id', gameId)
            .eq('user_id', playerId);

          if (updateError) throw updateError;
        }
        return;
      }

      const { data: players, error: playersError } = await supabase
        .from('game_players')
        .select('team')
        .eq('game_id', gameId);

      if (playersError) throw playersError;

      const team = players && players.length > 0 ? 
        (players.length % 2) + 1 : 
        1;

      const { error: insertError } = await supabase
        .from('game_players')
        .insert({
          game_id: gameId,
          user_id: playerId,
          team,
          hand: [],
          tricks: [],
          has_left: false
        });

      if (insertError) throw insertError;

      await fetchGames();
      setError(null);
    } catch (error) {
      console.error('Error joining game:', error);
      setError('Failed to join game. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const leaveGame = async (gameId: string, playerId: string) => {
    if (!currentUser) throw new Error('No user logged in');
    if (!supabase) throw new Error('Supabase client is not initialized');

    try {
      setIsLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('game_players')
        .update({ has_left: true })
        .eq('game_id', gameId)
        .eq('user_id', playerId);

      if (error) throw error;

      await fetchGames();
      setError(null);
    } catch (error) {
      console.error('Error leaving game:', error);
      setError('Failed to leave game. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteGame = async (gameId: string) => {
    if (!currentUser) throw new Error('No user logged in');
    if (!supabase) throw new Error('Supabase client is not initialized');

    try {
      setIsLoading(true);
      setError(null);
      
      const game = games.find(g => g.id === gameId);
      if (!game) {
        throw new Error('Game not found');
      }

      const isCreator = game.players && game.players[0]?.id === currentUser.id;
      
      if (!isCreator && currentUser.role !== 'admin') {
        throw new Error('Only game creators or admins can delete games');
      }

      const { error: updateError } = await supabase
        .from('games')
        .update({ deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', gameId);

      if (updateError) {
        const { error: deleteError } = await supabase
          .from('games')
          .delete()
          .eq('id', gameId);

        if (deleteError) throw deleteError;
      }

      setGames(prevGames => prevGames.filter(g => g.id !== gameId));
      setError(null);
    } catch (error) {
      console.error('Error deleting game:', error);
      setError('Failed to delete game. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAllGames = async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Only admins can delete all games');
    }
    if (!supabase) throw new Error('Supabase client is not initialized');

    try {
      setIsLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('games')
        .update({ deleted: true })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      setGames([]);
      setError(null);
    } catch (error) {
      console.error('Error deleting all games:', error);
      setError('Failed to delete all games. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = async (gameId: string) => {
    if (!currentUser) throw new Error('No user logged in');
    if (!supabase) throw new Error('Supabase client is not initialized');

    try {
      setIsLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('games')
        .update({ 
          state: GameState.PLAYING,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId);

      if (error) throw error;

      console.log('Game started successfully:', gameId);
      await fetchGames();
      setError(null);
    } catch (error) {
      console.error('Error starting game:', error);
      setError('Failed to start game. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (gameId: string, playerId: string, text: string) => {
    if (!currentUser) throw new Error('No user logged in');
    if (!supabase) throw new Error('Supabase client is not initialized');

    try {
      setIsLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('game_messages')
        .insert({
          game_id: gameId,
          user_id: playerId,
          text
        });

      if (error) throw error;

      await fetchGames();
      setError(null);
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
    createGame,
    joinGame,
    leaveGame,
    fetchGames,
    deleteGame,
    deleteAllGames,
    startGame,
    sendMessage,
    subscribeToGame,
    unsubscribeFromGame
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

export { GameProvider }

export { useGame }