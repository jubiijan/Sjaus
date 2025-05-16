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

    const { action, gameId, userId } = await req.json();

    // Verify user exists and is authenticated
    const { data: user, error: userError } = await supabaseClient.auth.admin.getUserById(userId);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    switch (action) {
      case 'create': {
        const { name, variant } = await req.json();
        const { data, error } = await supabaseClient
          .from('games')
          .insert([{
            name,
            variant,
            created_by: userId,
            state: 'waiting'
          }])
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
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
          .insert([{
            game_id: gameId,
            user_id: userId
          }]);

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

      case 'get': {
        // Get game and check access
        const { data: game, error: gameError } = await supabaseClient
          .from('games')
          .select(`
            *,
            game_players (
              user_id,
              team,
              hand,
              tricks,
              current_bid,
              has_left
            ),
            game_messages (
              id,
              user_id,
              text,
              created_at
            )
          `)
          .eq('id', gameId)
          .single();

        if (gameError) throw gameError;

        const canAccess = 
          game.state === 'waiting' ||
          game.created_by === userId ||
          game.game_players.some(p => p.user_id === userId);

        if (!canAccess) throw new Error('Unauthorized');

        return new Response(JSON.stringify(game), {
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