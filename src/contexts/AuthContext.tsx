import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/User';
import { supabase } from '../lib/supabase';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);

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
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    // Check active sessions and sets the user
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchUser(session.user.id);
        }
      } catch (error) {
        console.error('Error checking auth session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchUser(session.user.id);
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
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      // Check if user is banned or locked
      if (user.status === 'banned') {
        await logout();
        throw new Error('Your account has been suspended. Please contact support for assistance.');
      }

      if (user.account_locked) {
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

    } catch (error) {
      console.error('Error fetching user:', error);
      setCurrentUser(null);
      setIsAdmin(false);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // First check if the user exists and their status
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .ilike('email', email)
        .single();

      if (userError && userError.code === 'PGRST116') {
        throw new Error('Invalid email or password');
      }

      if (userError) throw userError;

      // Check user status before attempting login
      if (user.status === 'banned') {
        throw new Error('Your account has been suspended. Please contact support for assistance.');
      }

      if (user.account_locked) {
        if (user.lock_expires_at && new Date(user.lock_expires_at) > new Date()) {
          throw new Error(`Your account is temporarily locked. Please try again after ${new Date(user.lock_expires_at).toLocaleString()}`);
        }
        throw new Error(user.lock_reason || 'Your account is currently locked');
      }

      // Now attempt to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
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

      await fetchUser(user.id);

    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setCurrentUser(null);
      setIsAdmin(false);
      setUsers([]);

      // Clear any stored auth data
      localStorage.removeItem('supabase.auth.token');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });

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

      // User profile will be created by the database trigger
      await fetchUser(user.id);
    } catch (error) {
      console.error('Registration error:', error);
      setError('Failed to register. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (userId: string, data: Partial<User>) => {
    try {
      setIsLoading(true);
      setError(null);

      const { error } = await supabase
        .from('users')
        .update(data)
        .eq('id', userId);

      if (error) throw error;

      if (userId === currentUser?.id) {
        await fetchUser(userId);
      }

      // Refresh users list if admin
      if (isAdmin) {
        await fetchAllUsers();
      }
    } catch (error) {
      console.error('Update user error:', error);
      setError('Failed to update user. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

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
        await fetchAllUsers();
      }

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
    await updateUser(userId, { 
      status: 'banned',
      account_locked: true,
      lock_reason: 'Your account has been suspended. Please contact support for assistance.',
      lock_expires_at: null
    });

    // If the banned user is currently logged in, force logout
    if (userId === currentUser?.id) {
      await logout();
    }
  };

  const unbanUser = async (userId: string) => {
    await updateUser(userId, {
      status: 'active',
      account_locked: false,
      lock_reason: null,
      lock_expires_at: null,
      failed_login_attempts: 0
    });
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!currentUser) throw new Error('No user logged in');
    await updateUser(currentUser.id, data);
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
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext }