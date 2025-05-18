import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { action, gameId, userId, name, variant } = await req.json();

    // Verify user exists and is authenticated
    const { data: user, error: userError } = await supabaseClient.auth.admin.getUserById(userId);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    switch (action) {
      case 'get': {
        // Get all active games with their players and messages
        const { data: games, error: gamesError } = await supabaseClient
          .from('games')
          .select(`
            id,
            name,
            variant,
            state,
            created_by,
            current_player_id,
            trump_suit,
            trump_declarer,
            trump_length,
            score,
            deck,
            table_cards,
            current_trick,
            tricks,
            created_at,
            updated_at,
            deleted,
            deleted_at,
            game_players!inner (
              user_id,
              team,
              hand,
              tricks,
              current_bid,
              has_left,
              users!inner (
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
              users!inner (
                id,
                name
              )
            )
          `)
          .eq('deleted', false)
          .order('created_at', { ascending: false });

        if (gamesError) throw gamesError;

        // Transform the data to match the expected format
        const transformedGames = games.map(game => ({
          ...game,
          players: game.game_players.map(p => ({
            id: p.users.id,
            name: p.users.name,
            avatar: p.users.avatar
          })),
          messages: game.game_messages.map(m => ({
            id: m.id,
            playerId: m.users.id,
            playerName: m.users.name,
            text: m.text,
            timestamp: m.created_at
          }))
        }));

        return new Response(JSON.stringify(transformedGames), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'create': {
        // Create the game first
        const { data: game, error: createError } = await supabaseClient
          .from('games')
          .insert({
            name,
            variant,
            created_by: userId,
            state: 'waiting',
            deleted: false
          })
          .select()
          .single();

        if (createError) throw createError;

        // Add creator as first player
        const { error: playerError } = await supabaseClient
          .from('game_players')
          .insert({
            game_id: game.id,
            user_id: userId
          });

        if (playerError) throw playerError;

        // Return the complete game data
        const { data: fullGame, error: fullGameError } = await supabaseClient
          .from('games')
          .select(`
            *,
            game_players!inner (
              user_id,
              users!inner (
                id,
                name,
                avatar
              )
            )
          `)
          .eq('id', game.id)
          .single();

        if (fullGameError) throw fullGameError;

        // Transform to match expected format
        const transformedGame = {
          ...fullGame,
          players: fullGame.game_players.map(p => ({
            id: p.users.id,
            name: p.users.name,
            avatar: p.users.avatar
          }))
        };

        return new Response(JSON.stringify(transformedGame), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'join': {
        // Check if game exists and is in waiting state
        const { data: game, error: gameError } = await supabaseClient
          .from('games')
          .select('*, game_players(user_id)')
          .eq('id', gameId)
          .single();

        if (gameError || !game) throw new Error('Game not found');
        if (game.state !== 'waiting') throw new Error('Game is not accepting new players');

        // Check if player is already in the game
        const existingPlayer = game.game_players.find(p => p.user_id === userId);
        if (existingPlayer) {
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Check if game is full
        const maxPlayers = game.variant === 'four-player' ? 4 : 
                         game.variant === 'three-player' ? 3 : 2;
        if (game.game_players.length >= maxPlayers) {
          throw new Error('Game is full');
        }

        // Add player to game
        const { error: joinError } = await supabaseClient
          .from('game_players')
          .insert({
            game_id: gameId,
            user_id: userId
          });

        if (joinError) throw joinError;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'leave': {
        const { error: leaveError } = await supabaseClient
          .from('game_players')
          .delete()
          .match({ game_id: gameId, user_id: userId });

        if (leaveError) throw leaveError;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});