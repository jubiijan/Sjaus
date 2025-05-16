import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Target, Award, TrendingUp, Clock, Users, Crown, Medal, Star } from 'lucide-react';

const Statistics: React.FC = () => {
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  const winRate = currentUser.gamesPlayed > 0 
    ? Math.round((currentUser.gamesWon / currentUser.gamesPlayed) * 100) 
    : 0;

  const getRatingTitle = (rating: number): string => {
    if (rating >= 1800) return 'Master';
    if (rating >= 1600) return 'Expert';
    if (rating >= 1400) return 'Veteran';
    if (rating >= 1200) return 'Regular';
    return 'Novice';
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#0F172A] to-[#1E293B] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#1E293B] rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-[#334155]">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-white">Player Statistics</h1>
              <div className="flex items-center space-x-2">
                <div className="w-12 h-12 rounded-full bg-cover bg-center border-2 border-[#D4AF37]"
                     style={{ backgroundImage: `url(${currentUser.avatar})` }}></div>
                <div>
                  <p className="text-white font-semibold">{currentUser.name}</p>
                  <p className="text-gray-400 text-sm">Member since {new Date(currentUser.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Stats Grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Rating Card */}
              <div className="bg-gradient-to-br from-[#1E5631]/30 to-[#2D7A47]/30 rounded-lg p-6 border border-[#1E5631]/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Trophy className="h-6 w-6 text-[#D4AF37] mr-2" />
                    <h3 className="text-lg font-semibold text-white">Rating</h3>
                  </div>
                  <span className="text-2xl font-bold text-[#D4AF37]">{currentUser.rating}</span>
                </div>
                <p className="text-gray-400">{getRatingTitle(currentUser.rating)}</p>
                <div className="mt-4 h-2 bg-[#0F172A] rounded-full">
                  <div 
                    className="h-2 bg-[#D4AF37] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((currentUser.rating / 2000) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Games Played Card */}
              <div className="bg-gradient-to-br from-[#8B4513]/30 to-[#A65C2E]/30 rounded-lg p-6 border border-[#8B4513]/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Target className="h-6 w-6 text-[#D4AF37] mr-2" />
                    <h3 className="text-lg font-semibold text-white">Games Played</h3>
                  </div>
                  <span className="text-2xl font-bold text-white">{currentUser.gamesPlayed}</span>
                </div>
                <p className="text-gray-400">Total matches completed</p>
                <div className="mt-4 flex items-center">
                  <Award className="h-5 w-5 text-[#D4AF37] mr-2" />
                  <span className="text-gray-300">{currentUser.gamesWon} wins</span>
                </div>
              </div>

              {/* Win Rate Card */}
              <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-lg p-6 border border-[#334155]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <TrendingUp className="h-6 w-6 text-[#D4AF37] mr-2" />
                    <h3 className="text-lg font-semibold text-white">Win Rate</h3>
                  </div>
                  <span className="text-2xl font-bold text-white">{winRate}%</span>
                </div>
                <p className="text-gray-400">Victory percentage</p>
                <div className="mt-4 h-2 bg-[#0F172A] rounded-full">
                  <div 
                    className="h-2 bg-[#D4AF37] rounded-full transition-all duration-500"
                    style={{ width: `${winRate}%` }}
                  ></div>
                </div>
              </div>

              {/* Recent Performance Card */}
              <div className="bg-gradient-to-br from-[#1E293B] to-[#334155] rounded-lg p-6 border border-[#334155]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Clock className="h-6 w-6 text-[#D4AF37] mr-2" />
                    <h3 className="text-lg font-semibold text-white">Recent Games</h3>
                  </div>
                </div>
                <p className="text-gray-400">Last 5 matches performance</p>
                <div className="mt-4 flex space-x-2">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i}
                      className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        i < 3 ? 'bg-[#1E5631] text-white' : 'bg-[#8B4513] text-white'
                      }`}
                    >
                      {i < 3 ? 'W' : 'L'}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Players Section */}
            <div className="bg-[#0F172A] rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                <Star className="h-6 w-6 text-[#D4AF37] mr-2" />
                Top Players
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-[#1E293B] rounded-lg p-6 border border-[#334155] flex items-center justify-center">
                  <div className="text-center">
                    <Trophy className="h-12 w-12 text-[#D4AF37] mx-auto mb-4" />
                    <p className="text-lg text-white font-semibold mb-2">Coming Soon</p>
                    <p className="text-gray-400">Player rankings will be available soon!</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Achievements Section */}
            <div className="bg-[#0F172A] rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                <Medal className="h-6 w-6 text-[#D4AF37] mr-2" />
                Achievements
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { 
                    icon: Crown,
                    title: 'First Victory',
                    description: 'Win your first game',
                    progress: Math.min(currentUser.gamesWon > 0 ? 100 : 0, 100)
                  },
                  {
                    icon: Users,
                    title: 'Social Player',
                    description: 'Play 10 different opponents',
                    progress: Math.min((currentUser.gamesPlayed / 10) * 100, 100)
                  },
                  {
                    icon: Trophy,
                    title: 'Rising Star',
                    description: 'Reach 1400 rating',
                    progress: Math.min(((currentUser.rating - 1200) / 200) * 100, 100)
                  }
                ].map((achievement, index) => (
                  <div key={index} className="bg-[#1E293B] rounded-lg p-4 border border-[#334155]">
                    <div className="flex items-center mb-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        achievement.progress === 100 ? 'bg-[#1E5631]' : 'bg-[#334155]'
                      }`}>
                        <achievement.icon className={`h-5 w-5 ${
                          achievement.progress === 100 ? 'text-[#D4AF37]' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-white font-semibold">{achievement.title}</h3>
                        <p className="text-gray-400 text-sm">{achievement.description}</p>
                      </div>
                    </div>
                    <div className="h-2 bg-[#0F172A] rounded-full">
                      <div 
                        className="h-2 bg-[#D4AF37] rounded-full transition-all duration-500"
                        style={{ width: `${achievement.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;