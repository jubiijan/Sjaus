import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User } from '../types/User';
import { supabase, cleanAuthState } from '../lib/supabase';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  error: string | null;
  users: User[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  updateUser: (userId: string, data: Partial<User>) => Promise<void>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  banUser: (userId: string) => Promise<void>;
  unbanUser: (userId: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  resetAuthState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TIMEOUT = 15000; // 15 seconds timeout for auth operations

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  
  // Ref to store timeouts for cleanup
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Fetch all users when admin status changes
  useEffect(() => {
    if (isAdmin) {
      fetchAllUsers();
    } else {
      setUsers([]);
    }
  }, [isAdmin]);

  const fetchAllUsers = async () => {
    try {
      console.log('Fetching all users');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
      console.log(`Fetched ${data?.length || 0} users`);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    // Check active sessions and sets the user
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        setIsLoading(true);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('Session found, fetching user data');
          try {
            await fetchUser(session.user.id);
          } catch (error) {
            console.error('Error fetching user data during initialization:', error);
            setCurrentUser(null);
            setIsAdmin(false);
          }
        } else {
          console.log('No active session found');
          setCurrentUser(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking auth session:', error);
        setCurrentUser(null);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
        console.log('Auth initialization complete');
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (session?.user) {
        try {
          await fetchUser(session.user.id);
        } catch (error) {
          console.error('Error fetching user data on auth state change:', error);
          setCurrentUser(null);
          setIsAdmin(false);
        }
      } else {
        setCurrentUser(null);
        setIsAdmin(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUser = async (userId: string) => {
    console.log('Fetching user data for ID:', userId);
    
    // Set up timeout for the fetch operation
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutRef.current = setTimeout(() => {
        reject(new Error('User data fetch timed out'));
      }, AUTH_TIMEOUT);
    });

    try {
      // Race the fetch against timeout
      const userDataPromise = fetchUserData(userId);
      await Promise.race([userDataPromise, timeoutPromise]);
      
      // Clear timeout if fetch was successful
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
    } catch (error) {
      console.error('Error fetching user:', error);
      setCurrentUser(null);
      setIsAdmin(false);
      
      // Clear timeout if fetch failed
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      throw error;
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      console.log('User data retrieved:', user?.name || 'Unknown user');

      // Check if user is banned or locked
      if (user.status === 'banned') {
        console.log('User is banned, triggering logout');
        await logout();
        throw new Error('Your account has been suspended. Please contact support for assistance.');
      }

      if (user.account_locked) {
        console.log('User account is locked, triggering logout');
        await logout();
        if (user.lock_expires_at && new Date(user.lock_expires_at) > new Date()) {
          throw new Error(`Your account is temporarily locked. Please try again after ${new Date(user.lock_expires_at).toLocaleString()}`);
        } else {
          throw new Error(user.lock_reason || 'Your account is currently locked');
        }
      }

      setCurrentUser(user);
      setIsAdmin(user.role === 'admin');

      // Update last login time
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);

      console.log('User login time updated');
      
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    console.log('Login attempt for:', email);
    
    // Set up timeout for the login operation
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutRef.current = setTimeout(() => {
        reject(new Error('Login operation timed out'));
      }, AUTH_TIMEOUT);
    });

    try {
      setIsLoading(true);
      setError(null);

      // First check if the user exists and their status
      console.log('Checking user status');
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .ilike('email', email)
        .single();

      if (userError && userError.code === 'PGRST116') {
        console.log('User not found');
        throw new Error('Invalid email or password');
      }

      if (userError) throw userError;

      // Check user status before attempting login
      if (user.status === 'banned') {
        console.log('Login attempt for banned user');
        throw new Error('Your account has been suspended. Please contact support for assistance.');
      }

      if (user.account_locked) {
        console.log('Login attempt for locked account');
        if (user.lock_expires_at && new Date(user.lock_expires_at) > new Date()) {
          throw new Error(`Your account is temporarily locked. Please try again after ${new Date(user.lock_expires_at).toLocaleString()}`);
        }
        throw new Error(user.lock_reason || 'Your account is currently locked');
      }

      // Now attempt to sign in
      console.log('Attempting to sign in');
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        console.log('Sign in failed:', signInError.message);
        // Handle failed login attempt
        const { error: updateError } = await supabase
          .from('users')
          .update({
            failed_login_attempts: (user.failed_login_attempts || 0) + 1,
            last_failed_login: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) console.error('Error updating failed login attempts:', updateError);

        throw new Error('Invalid email or password');
      }

      console.log('Sign in successful, fetching user data');
      
      // Race the fetchUser operation against timeout
      await Promise.race([fetchUser(user.id), timeoutPromise]);
      
      // Clear timeout if login was successful
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      console.log('Login process completed successfully');

    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      
      // Clear timeout if login failed
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    console.log('Logout initiated');
    
    try {
      setIsLoading(true);
      setError(null);

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setCurrentUser(null);
      setIsAdmin(false);
      setUsers([]);

      console.log('Logout successful, cleaning up local storage');
      
      // Clear any stored auth data
      localStorage.removeItem('supabase.auth.token');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });

      console.log('Redirect to home page');
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      setError('Failed to logout. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    console.log('Registration attempt for:', email);
    
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!user) throw new Error('No user returned after registration');

      console.log('Registration successful, fetching user data');
      
      // User profile will be created by the database trigger
      await fetchUser(user.id);
      
      console.log('Registration and initial login complete');
      
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Improved error reporting
      if (error?.message?.includes('user_already_exists')) {
        setError('This email is already registered. Please log in or use a different email.');
      } else if (error?.message?.includes('invalid_format')) {
        setError('Invalid email format. Please check your email and try again.');
      } else if (error?.message?.includes('weak_password')) {
        setError('Password is too weak. Please use a stronger password.');
      } else {
        setError('Failed to create account. Please try again.');
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (userId: string, data: Partial<User>) => {
    console.log('Updating user:', userId);
    
    try {
      setIsLoading(true);
      setError(null);

      const { error } = await supabase
        .from('users')
        .update(data)
        .eq('id', userId);

      if (error) throw error;

      if (userId === currentUser?.id) {
        console.log('Updated current user, refreshing user data');
        await fetchUser(userId);
      }

      // Refresh users list if admin
      if (isAdmin) {
        console.log('Admin user updated someone, refreshing user list');
        await fetchAllUsers();
      }
      
      console.log('User update successful');
      
    } catch (error) {
      console.error('Update user error:', error);
      setError('Failed to update user. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    console.log('Deleting user:', userId);
    
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      console.log('Calling delete-user function');
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      // Refresh users list if admin
      if (isAdmin) {
        console.log('User deleted, refreshing user list');
        await fetchAllUsers();
      }

      console.log('User deletion successful');
      return { success: true };
    } catch (error) {
      console.error('Delete user error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete user' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const banUser = async (userId: string) => {
    console.log('Banning user:', userId);
    
    await updateUser(userId, { 
      status: 'banned',
      account_locked: true,
      lock_reason: 'Your account has been suspended. Please contact support for assistance.',
      lock_expires_at: null
    });

    // If the banned user is currently logged in, force logout
    if (userId === currentUser?.id) {
      console.log('Banned current user, forcing logout');
      await logout();
    }
    
    console.log('User banned successfully');
  };

  const unbanUser = async (userId: string) => {
    console.log('Unbanning user:', userId);
    
    await updateUser(userId, {
      status: 'active',
      account_locked: false,
      lock_reason: null,
      lock_expires_at: null,
      failed_login_attempts: 0
    });
    
    console.log('User unbanned successfully');
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!currentUser) throw new Error('No user logged in');
    console.log('Updating profile for current user');
    
    await updateUser(currentUser.id, data);
    
    console.log('Profile updated successfully');
  };

  const resetAuthState = async () => {
    console.log('Resetting auth state');
    
    try {
      setIsLoading(true);
      await cleanAuthState();
      setCurrentUser(null);
      setIsAdmin(false);
      setError(null);
      console.log('Auth state reset successful');
    } catch (error) {
      console.error('Error resetting auth state:', error);
      setError('Failed to reset authentication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    currentUser,
    isLoading,
    isAdmin,
    error,
    users,
    login,
    logout,
    register,
    updateUser,
    deleteUser,
    banUser,
    unbanUser,
    updateProfile,
    resetAuthState
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Export the useAuth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext };