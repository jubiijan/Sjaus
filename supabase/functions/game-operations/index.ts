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

    const { action, gameId, userId, data } = await req.json();

    // Verify user exists and is authenticated
    const { data: user, error: userError } = await supabaseClient.auth.admin.getUserById(userId);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    switch (action) {
      case 'calculateScore': {
        const { tricks } = data;
        let team1Score = 0;
        let team2Score = 0;

        // Calculate scores based on tricks
        tricks.forEach((trick: any) => {
          const points = trick.points || 0;
          if (trick.winner_team === 1) {
            team1Score += points;
          } else {
            team2Score += points;
          }
        });

        const { error } = await supabaseClient
          .from('games')
          .update({
            score: { team1: team1Score, team2: team2Score }
          })
          .eq('id', gameId);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, team1Score, team2Score }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'updateGameState': {
        const { state, currentPlayer } = data;
        const { error } = await supabaseClient
          .from('games')
          .update({
            state,
            current_player_id: currentPlayer,
            updated_at: new Date().toISOString()
          })
          .eq('id', gameId);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'playCard': {
        const { card, position } = data;
        const { error } = await supabaseClient.rpc('play_card', {
          p_game_id: gameId,
          p_user_id: userId,
          p_card: card,
          p_position: position
        });

        if (error) throw error;
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