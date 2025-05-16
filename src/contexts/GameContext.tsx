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
    
    // Parse the game data to handle player structure correctly
    const gameData = game as Game;
    
    // Create a new player object for the current user
    const newPlayer: Player = {
      id: currentUser.id,
      name: currentUser.name,
      avatar: currentUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
      hand: [],
      tricks: [],
      currentBid: null
    };
    
    // Check if the player already exists in the game
    let playerExists = false;
    let updatedPlayers = [];
    
    if (gameData.players && Array.isArray(gameData.players)) {
      const existingPlayerIndex = gameData.players.findIndex(p => 
        typeof p === 'object' && p !== null && 'id' in p && p.id === currentUser.id
      );
      
      if (existingPlayerIndex >= 0) {
        console.log('Player already exists in the game, updating status');
        playerExists = true;
        
        // Update player (marking as not left if they were previously left)
        updatedPlayers = gameData.players.map((p, index) => 
          index === existingPlayerIndex ? { ...p, left: false } : p
        );
      } else {
        // Add new player
        updatedPlayers = [...gameData.players, newPlayer];
      }
    } else {
      // No players array or invalid format, create new array with current player
      updatedPlayers = [newPlayer];
    }
    
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
    
    console.log('Successfully joined/updated in game');
    
    // Set this as the current game
    setCurrentGame({
      ...gameData,
      players: updatedPlayers
    });
    
    // Refresh the games list
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