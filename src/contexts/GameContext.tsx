// Update the createGame function
const createGame = async (variant: GameVariant, name: string): Promise<string> => {
  if (!currentUser) throw new Error('User must be logged in to create a game');

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/game-access`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
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
    throw new Error(error.error || 'Failed to create game');
  }

  const game = await response.json();
  await fetchGames();
  return game.id;
};

// Update the joinGame function
const joinGame = async (gameId: string): Promise<void> => {
  if (!currentUser) throw new Error('User must be logged in to join a game');

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/game-access`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'join',
      userId: currentUser.id,
      gameId
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to join game');
  }

  await fetchGames();
};

// Update the leaveGame function
const leaveGame = async (gameId: string): Promise<void> => {
  if (!currentUser) throw new Error('User must be logged in to leave a game');

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/game-access`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'leave',
      userId: currentUser.id,
      gameId
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to leave game');
  }

  await fetchGames();
};