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

    const { action, userId, data } = await req.json();

    // Verify user exists and is authenticated
    const { data: user, error: userError } = await supabaseClient.auth.admin.getUserById(userId);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    switch (action) {
      case 'findMatch': {
        const { variant } = data;
        
        // Find available game with matching variant
        const { data: games, error: gamesError } = await supabaseClient
          .from('games')
          .select('*')
          .eq('variant', variant)
          .eq('state', 'waiting')
          .order('created_at', { ascending: true })
          .limit(1);

        if (gamesError) throw gamesError;

        if (games && games.length > 0) {
          // Join existing game
          const game = games[0];
          const { error: joinError } = await supabaseClient
            .from('game_players')
            .insert({
              game_id: game.id,
              user_id: userId
            });

          if (joinError) throw joinError;
          return new Response(JSON.stringify({ success: true, gameId: game.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else {
          // Create new game
          const { data: newGame, error: createError } = await supabaseClient
            .from('games')
            .insert({
              variant,
              state: 'waiting',
              created_by: userId,
              name: `${user.user_metadata.name}'s Game`
            })
            .select()
            .single();

          if (createError) throw createError;

          // Add creator as first player
          const { error: playerError } = await supabaseClient
            .from('game_players')
            .insert({
              game_id: newGame.id,
              user_id: userId
            });

          if (playerError) throw playerError;

          return new Response(JSON.stringify({ success: true, gameId: newGame.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
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