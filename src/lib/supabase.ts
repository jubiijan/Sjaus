import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please create a .env file in the project root with the following variables:\n\n' +
    'VITE_SUPABASE_URL=your-project-url\n' +
    'VITE_SUPABASE_ANON_KEY=your-anon-key\n\n' +
    'You can find these values in your Supabase project settings.'
  );
}

// Create the Supabase client with improved configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
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
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Simplified session recovery function with better error handling
export const recoverSession = async () => {
  try {
    console.log('Attempting to recover session');
    
    // Check for an existing session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.warn('Session retrieval error:', sessionError.message);
      return null;
    }
    
    // If no session exists, return null without attempting refresh
    if (!session) {
      console.log('No session found');
      return null;
    }
    
    console.log('Session found, verifying user');
    
    // Verify the session by checking the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.warn('User retrieval error:', userError.message);
      
      // Only clean up and sign out if there was an actual auth error
      if (userError.message.includes('JWT') || 
          userError.message.includes('Token') || 
          userError.message.includes('Authorization')) {
        console.log('Auth token invalid, signing out');
        await supabase.auth.signOut({ scope: 'local' });
      }
      return null;
    }
    
    if (!user) {
      console.warn('No user found in session');
      return null;
    }
    
    console.log('Valid session recovered for user:', user.id);
    return session;
  } catch (error) {
    console.error('Unexpected error during session recovery:', error);
    // Clean up and sign out for unexpected errors
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (e) {
      console.error('Error during sign out:', e);
    }
    return null;
  }
};

// Helper function to clean auth state - useful for troubleshooting
export const cleanAuthState = async () => {
  console.log('Cleaning auth state');
  try {
    // Remove all Supabase-related items from localStorage
    const localStorageKeys = Object.keys(localStorage);
    const authKeys = localStorageKeys.filter(key => 
      key.startsWith('sb-') || 
      key.includes('supabase') ||
      key.includes('supa')
    );
    
    console.log('Removing auth keys:', authKeys);
    authKeys.forEach(key => localStorage.removeItem(key));
    
    // Sign out completely
    await supabase.auth.signOut({ scope: 'global' });
    console.log('Auth state cleaned successfully');
    
    return true;
  } catch (error) {
    console.error('Error cleaning auth state:', error);
    return false;
  }
};

// New function to check auth status
export const checkAuthStatus = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    
    if (!session) {
      return { loggedIn: false, user: null };
    }
    
    return { loggedIn: true, user: session.user };
  } catch (error) {
    console.error('Error checking auth status:', error);
    return { loggedIn: false, user: null, error };
  }
};