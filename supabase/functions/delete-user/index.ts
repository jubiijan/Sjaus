import { createClient } from 'npm:@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    })
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Parse request body
    const { userId } = await req.json()
    
    if (!userId) {
      throw new Error('User ID is required')
    }

    // First, check if user exists in auth.users
    const { data: authUser, error: authCheckError } = await supabaseClient.auth.admin.getUserById(userId)
    
    if (authCheckError) {
      console.error('Error checking auth user:', authCheckError)
      throw new Error(`Failed to verify user existence: ${authCheckError.message}`)
    }

    if (!authUser) {
      throw new Error('User not found in auth system')
    }

    // Delete auth user first
    const { error: deleteAuthError } = await supabaseClient.auth.admin.deleteUser(userId)
    
    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError)
      throw new Error(`Failed to delete auth user: ${deleteAuthError.message}`)
    }

    // Now delete related data in the correct order
    // 1. Delete game-related data
    const { error: gamePlayersError } = await supabaseClient
      .from('game_players')
      .delete()
      .eq('user_id', userId)

    if (gamePlayersError) {
      console.error('Error deleting game players:', gamePlayersError)
      // Continue with other deletions even if this fails
    }

    // 2. Delete messages
    const { error: messagesError } = await supabaseClient
      .from('game_messages')
      .delete()
      .eq('user_id', userId)

    if (messagesError) {
      console.error('Error deleting messages:', messagesError)
      // Continue with other deletions even if this fails
    }

    // 3. Delete reports
    const { error: reportsError } = await supabaseClient
      .from('reports')
      .delete()
      .or(`reporter_id.eq.${userId},reported_user_id.eq.${userId}`)

    if (reportsError) {
      console.error('Error deleting reports:', reportsError)
      // Continue with other deletions even if this fails
    }

    // 4. Delete user profile
    const { error: profileError } = await supabaseClient
      .from('users')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Error deleting user profile:', profileError)
      // Continue even if profile deletion fails as auth user is already deleted
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Delete user error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})