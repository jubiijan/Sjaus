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
        // Get all active games
        const { data: games, error: gamesError } = await supabaseClient
          .from('games')
          .select(`
            *,
            players:game_players(
              user:users(
                id,
                name,
                avatar
              )
            ),
            messages:game_messages(
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

        if (gamesError) throw gamesError;

        // Transform the data to match the expected format
        const transformedGames = games.map(game => ({
          ...game,
          players: game.players.map(p => ({
            id: p.user.id,
            name: p.user.name,
            avatar: p.user.avatar
          })),
          messages: game.messages.map(m => ({
            id: m.id,
            playerId: m.user.id,
            playerName: m.user.name,
            text: m.text,
            timestamp: m.created_at
          }))
        }));

        return new Response(JSON.stringify(transformedGames), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'create': {
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

        return new Response(JSON.stringify(game), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'join': {
        // Check if game exists and is in waiting state
        const { data: game, error: gameError } = await supabaseClient
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();

        if (gameError || !game) throw new Error('Game not found');
        if (game.state !== 'waiting') throw new Error('Game is not accepting new players');

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