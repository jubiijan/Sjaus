// Update the joinGame function in GameContext
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