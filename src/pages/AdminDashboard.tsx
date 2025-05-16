import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { User } from '../types/User';
import { Search } from 'lucide-react';
import DashboardSummary from '../components/admin/DashboardSummary';
import UsersList from '../components/admin/UsersList';
import GamesList from '../components/admin/GamesList';
import EditUserModal from '../components/admin/EditUserModal';
import DeleteConfirmationModal from '../components/admin/DeleteConfirmationModal';
import { supabase } from '../lib/supabase';

const ACTIVE_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

const AdminDashboard: React.FC = () => {
  const { currentUser, isAdmin, users = [], updateUser, deleteUser, banUser, unbanUser } = useAuth();
  const { games = [], deleteGame, deleteAllGames } = useGame();
  const [activeTab, setActiveTab] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showDeleteGameConfirm, setShowDeleteGameConfirm] = useState<string | null>(null);
  const [showDeleteAllGamesConfirm, setShowDeleteAllGamesConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  if (!isAdmin || !currentUser) return null;

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isUserActive = (user: User) => {
    return user.last_login && 
           (new Date().getTime() - new Date(user.last_login).getTime()) < ACTIVE_THRESHOLD;
  };

  const activeUsers = filteredUsers.filter(isUserActive);

  const handleUpdateUser = async (userId: string, userData: Partial<User>) => {
    try {
      await updateUser(userId, userData);
      setEditingUser(null);
      setError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
      setError(errorMessage);
      console.error('Failed to update user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      if (userId === currentUser.id) {
        throw new Error('Cannot delete your own admin account');
      }

      const result = await deleteUser(userId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete user');
      }
      setShowDeleteConfirm(null);
      setError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
      setError(errorMessage);
      console.error('Failed to delete user:', error);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    try {
      await deleteGame(gameId);
      setShowDeleteGameConfirm(null);
      setError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete game';
      setError(errorMessage);
      console.error('Failed to delete game:', error);
    }
  };

  const handleDeleteAllGames = async () => {
    try {
      await deleteAllGames();
      setShowDeleteAllGamesConfirm(false);
      setError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete all games';
      setError(errorMessage);
      console.error('Failed to delete all games:', error);
    }
  };

  const handleToggleAdmin = async (userId: string, makeAdmin: boolean) => {
    try {
      if (!currentUser?.id) {
        setError('No authenticated user found');
        return;
      }

      if (!isAdmin) {
        setError('Only administrators can modify user roles');
        return;
      }

      if (userId === currentUser.id && !makeAdmin) {
        setError('Administrators cannot remove their own admin privileges');
        return;
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`);
      }

      if (!session?.access_token) {
        throw new Error('No valid session available. Please log in again.');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-role`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId, 
          makeAdmin,
          requestingUserId: currentUser.id 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update user role: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update user role');
      }

      await updateUser(userId, { role: makeAdmin ? 'admin' : 'user' });
      setError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user role';
      setError(errorMessage);
      console.error('Failed to update user role:', error);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#0F172A] to-[#1E293B] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white mb-8">Admin Dashboard</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-500 text-white rounded-lg">
            {error}
          </div>
        )}
        
        <DashboardSummary users={users} activeUsers={activeUsers} />
        
        <div className="bg-[#1E293B] rounded-lg shadow-lg overflow-hidden">
          <div className="flex border-b border-[#334155]">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'users'
                  ? 'text-white bg-[#334155]'
                  : 'text-gray-400 hover:text-white hover:bg-[#334155] bg-opacity-50'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('games')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'games'
                  ? 'text-white bg-[#334155]'
                  : 'text-gray-400 hover:text-white hover:bg-[#334155] bg-opacity-50'
              }`}
            >
              Games
            </button>
          </div>
          
          <div className="p-6">
            {activeTab === 'users' && (
              <>
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      placeholder="Search users by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-[#0F172A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    />
                  </div>
                </div>

                <UsersList
                  users={filteredUsers}
                  onEdit={setEditingUser}
                  onBan={banUser}
                  onUnban={unbanUser}
                  onDelete={(userId) => setShowDeleteConfirm(userId)}
                  onToggleAdmin={handleToggleAdmin}
                  currentUserId={currentUser.id}
                  isUserActive={isUserActive}
                />
              </>
            )}
            
            {activeTab === 'games' && (
              <GamesList
                games={games || []}
                onDelete={(gameId) => setShowDeleteGameConfirm(gameId)}
                onDeleteAll={() => setShowDeleteAllGamesConfirm(true)}
              />
            )}
          </div>
        </div>
      </div>

      <EditUserModal
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSave={handleUpdateUser}
      />

      <DeleteConfirmationModal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => showDeleteConfirm && handleDeleteUser(showDeleteConfirm)}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
      />

      <DeleteConfirmationModal
        isOpen={!!showDeleteGameConfirm}
        onClose={() => setShowDeleteGameConfirm(null)}
        onConfirm={() => showDeleteGameConfirm && handleDeleteGame(showDeleteGameConfirm)}
        title="Delete Game"
        message="Are you sure you want to delete this game? This action cannot be undone."
      />

      <DeleteConfirmationModal
        isOpen={showDeleteAllGamesConfirm}
        onClose={() => setShowDeleteAllGamesConfirm(false)}
        onConfirm={handleDeleteAllGames}
        title="Delete All Games"
        message="Are you sure you want to delete all games? This action cannot be undone and will remove all game data from the system."
      />
    </div>
  );
};

export default AdminDashboard;