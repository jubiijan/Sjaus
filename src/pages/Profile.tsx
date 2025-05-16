import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Camera, Mail } from 'lucide-react';

const Profile: React.FC = () => {
  const { currentUser, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  if (!currentUser) return null;

  const handleSave = async () => {
    setError('');
    setIsSaving(true);
    
    try {
      await updateProfile({
        name,
        email,
        avatar
      });
      setEditing(false);
    } catch (error) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const generateRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(2, 15);
    setAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#0F172A] to-[#1E293B] py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#1E293B] rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-[#334155]">
            <h1 className="text-2xl font-bold text-white">Your Profile</h1>
          </div>
          
          <div className="p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg">
                <p className="text-red-500">{error}</p>
              </div>
            )}
            
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
              {/* Avatar */}
              <div className="flex flex-col items-center">
                <div 
                  className="w-32 h-32 rounded-full border-4 border-[#D4AF37] overflow-hidden mb-3"
                  style={{ 
                    backgroundImage: `url(${avatar})`,
                    backgroundSize: 'cover'
                  }}
                ></div>
                
                {editing && (
                  <button
                    onClick={generateRandomAvatar}
                    className="flex items-center text-sm bg-[#334155] hover:bg-[#475569] text-white px-3 py-1 rounded-lg"
                  >
                    <Camera className="h-4 w-4 mr-1" />
                    Change
                  </button>
                )}
              </div>
              
              {/* Profile details */}
              <div className="flex-1">
                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white text-sm font-bold mb-2" htmlFor="name">
                        Name
                      </label>
                      <div className="flex items-center bg-[#0F172A] rounded-lg px-3 py-2">
                        <User className="h-5 w-5 text-gray-400 mr-2" />
                        <input
                          id="name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="bg-transparent text-white w-full focus:outline-none"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-white text-sm font-bold mb-2" htmlFor="email">
                        Email
                      </label>
                      <div className="flex items-center bg-[#0F172A] rounded-lg px-3 py-2">
                        <Mail className="h-5 w-5 text-gray-400 mr-2" />
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="bg-transparent text-white w-full focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-gray-400 text-sm">Name</h3>
                      <p className="text-white text-lg">{currentUser.name}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-gray-400 text-sm">Email</h3>
                      <p className="text-white text-lg">{currentUser.email}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-gray-400 text-sm">Account Type</h3>
                      <p className="text-white text-lg capitalize">{currentUser.role}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Game statistics */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4">Game Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#0F172A] rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm">Games Played</p>
                  <p className="text-2xl font-bold text-white">{currentUser.gamesPlayed}</p>
                </div>
                
                <div className="bg-[#0F172A] rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm">Games Won</p>
                  <p className="text-2xl font-bold text-white">{currentUser.gamesWon}</p>
                </div>
                
                <div className="bg-[#0F172A] rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm">Win Rate</p>
                  <p className="text-2xl font-bold text-white">
                    {currentUser.gamesPlayed 
                      ? Math.round((currentUser.gamesWon / currentUser.gamesPlayed) * 100) 
                      : 0}%
                  </p>
                </div>
              </div>
            </div>
            
            {/* Player rating */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4">Player Rating</h2>
              <div className="bg-[#0F172A] rounded-lg p-6 flex items-center justify-between">
                <div>
                  <p className="text-gray-400 mb-1">Current Rating</p>
                  <p className="text-3xl font-bold text-white">{currentUser.rating}</p>
                </div>
                
                <div className="w-24 h-24 rounded-full border-8 border-[#1E5631] flex items-center justify-center bg-[#0F172A]">
                  <span className="text-2xl font-bold text-[#D4AF37]">
                    {getRatingTitle(currentUser.rating)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex justify-end space-x-3">
              {editing ? (
                <>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setName(currentUser.name);
                      setEmail(currentUser.email);
                      setAvatar(currentUser.avatar);
                    }}
                    className="bg-[#334155] hover:bg-[#475569] text-white font-bold py-2 px-4 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-[#D4AF37] hover:bg-[#E9C85D] text-[#0F172A] font-bold py-2 px-4 rounded-lg"
                  >
                    {isSaving ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#0F172A]"></div>
                        <span className="ml-2">Saving...</span>
                      </div>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="bg-[#1E5631] hover:bg-[#2D7A47] text-white font-bold py-2 px-4 rounded-lg"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to determine rating title
const getRatingTitle = (rating: number): string => {
  if (rating >= 1800) return 'Master';
  if (rating >= 1600) return 'Expert';
  if (rating >= 1400) return 'Veteran';
  if (rating >= 1200) return 'Regular';
  return 'Novice';
};

export default Profile;