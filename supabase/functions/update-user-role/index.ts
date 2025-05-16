import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface RequestBody {
  userId: string;
  makeAdmin: boolean;
  requestingUserId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Create Supabase client
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

    // Verify request method
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    // Parse request body
    const { userId, makeAdmin, requestingUserId } = await req.json() as RequestBody;

    if (!userId || typeof makeAdmin !== 'boolean' || !requestingUserId) {
      throw new Error('Invalid request parameters');
    }

    // First verify the requesting user's role
    const { data: requestingUserData, error: requestingUserError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', requestingUserId)
      .single();

    if (requestingUserError || !requestingUserData) {
      throw new Error('Failed to verify requesting user');
    }

    if (requestingUserData.role !== 'admin') {
      throw new Error('Unauthorized: Only administrators can modify user roles');
    }

    // Get target user
    const { data: targetUser, error: targetUserError } = await supabaseClient
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (targetUserError || !targetUser) {
      throw new Error('Target user not found');
    }

    // Prevent self-demotion
    if (userId === requestingUserId && !makeAdmin) {
      throw new Error('Administrators cannot remove their own admin privileges');
    }

    // Update user role in the database
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({ role: makeAdmin ? 'admin' : 'user' })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Failed to update user role: ${updateError.message}`);
    }

    // Return success response
    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );

  } catch (error) {
    // Return error response
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    );
  }
});