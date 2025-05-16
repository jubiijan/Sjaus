import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Game } from '../types/Game';

interface GameContextType {
  games: Game[];
  currentGame: Game | null;
  loading: boolean;
  error: string | null;
  fetchGames: () => Promise<void>;
  joinGame: (gameId: string, playerId: string) => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGames(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToGame = (gameId: string) => {
    const subscription = supabase
      .channel(`game:${gameId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`
      }, 
      async (payload) => {
        await fetchGames();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const joinGame = async (gameId: string, playerId: string): Promise<void> => {
    if (!gameId || !playerId) throw new Error('Game ID and player ID are required');

    try {
      const { data: game, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (fetchError) throw fetchError;

      // Check if game exists and is joinable
      if (!game) throw new Error('Game not found');
      if (game.state !== 'waiting' && !game.players.includes(playerId)) {
        throw new Error('Cannot join game in progress');
      }

      // Check if player is already in the game
      if (game.players.includes(playerId)) {
        return; // Already joined
      }

      // Check max players
      const maxPlayers = game.variant === 'four-player' ? 4 : 
                        game.variant === 'three-player' ? 3 : 2;
      if (game.players.length >= maxPlayers) {
        throw new Error('Game is full');
      }

      // Update players array
      const updatedPlayers = [...game.players, playerId];
      const { error: updateError } = await supabase
        .from('games')
        .update({ players: updatedPlayers })
        .eq('id', gameId);

      if (updateError) throw updateError;

      // Subscribe to game updates
      subscribeToGame(gameId);
      
      // Fetch updated games
      await fetchGames();
    } catch (error) {
      console.error('Error joining game:', error);
      throw error;
    }
  };

  const value = {
    games,
    currentGame,
    loading,
    error,
    fetchGames,
    joinGame,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};