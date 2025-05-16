import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create the Supabase client with improved configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Changed to false to avoid URL-based session conflicts that might cause cookie issues
    detectSessionInUrl: false, 
    flowType: 'pkce',
    storage: localStorage,
    storageKey: 'supabase.auth.token'
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'sjaus'
    }
  },
  // Added realtime configuration for better performance with multiplayer features
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Enhanced session recovery function with better error handling and cleanup
export const recoverSession = async () => {
  try {
    // Clear any potentially corrupted auth data before checking session
    const localStorageKeys = Object.keys(localStorage);
    const staleAuthKeys = localStorageKeys.filter(key => 
      key.startsWith('sb-') || 
      key.includes('supabase.auth') ||
      key.includes('supabase_auth')
    ).filter(key => 
      // Don't remove the current auth token if it exists
      key !== 'supabase.auth.token' || 
      !localStorage.getItem('supabase.auth.token')
    );
    
    // Remove any stale auth keys that might be causing conflicts
    staleAuthKeys.forEach(key => localStorage.removeItem(key));
    
    // Now check for an existing session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.warn('Session retrieval error:', sessionError.message);
      return null;
    }
    
    // If no session exists, return null without attempting refresh
    if (!session) {
      return null;
    }
    
    // Verify the session by checking the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.warn('User retrieval error:', userError.message);
      // Only sign out if there was an actual auth error
      if (userError.message.includes('JWT') || 
          userError.message.includes('Token') || 
          userError.message.includes('Authorization')) {
        // Clean up before signing out
        ['supabase.auth.token', 'supabase.auth.refreshToken'].forEach(key => 
          localStorage.removeItem(key)
        );
        await supabase.auth.signOut({ scope: 'local' });
      }
      return null;
    }
    
    if (!user) {
      console.warn('No user found in session');
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Unexpected error during session recovery:', error);
    // Clean up and sign out for unexpected errors
    ['supabase.auth.token', 'supabase.auth.refreshToken'].forEach(key => 
      localStorage.removeItem(key)
    );
    await supabase.auth.signOut({ scope: 'local' });
    return null;
  }
};

// Helper function to clean auth state - useful for troubleshooting
export const cleanAuthState = async () => {
  // Remove all Supabase-related items from localStorage
  const localStorageKeys = Object.keys(localStorage);
  const authKeys = localStorageKeys.filter(key => 
    key.startsWith('sb-') || 
    key.includes('supabase') ||
    key.includes('supa')
  );
  
  authKeys.forEach(key => localStorage.removeItem(key));
  
  // Sign out completely
  await supabase.auth.signOut({ scope: 'global' });
  
  // Reload the page to ensure clean state
  window.location.reload();
};