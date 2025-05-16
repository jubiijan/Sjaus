import React from 'react';
import { Users, Clock, Activity, Ban } from 'lucide-react';
import { User } from '../../types/User';

interface DashboardSummaryProps {
  users: User[];
  activeUsers: User[];
}

const DashboardSummary: React.FC<DashboardSummaryProps> = ({ users, activeUsers }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-[#1E293B] rounded-lg p-6 shadow-lg flex items-center">
        <div className="h-12 w-12 bg-[#1E5631] rounded-full flex items-center justify-center mr-4">
          <Users className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-gray-400 text-sm">Total Users</p>
          <p className="text-2xl font-bold text-white">{users.length}</p>
        </div>
      </div>
      
      <div className="bg-[#1E293B] rounded-lg p-6 shadow-lg flex items-center">
        <div className="h-12 w-12 bg-[#8B4513] rounded-full flex items-center justify-center mr-4">
          <Activity className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-gray-400 text-sm">Online Users</p>
          <p className="text-2xl font-bold text-white">
            {activeUsers.length}
          </p>
        </div>
      </div>
      
      <div className="bg-[#1E293B] rounded-lg p-6 shadow-lg flex items-center">
        <div className="h-12 w-12 bg-red-600 rounded-full flex items-center justify-center mr-4">
          <Ban className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-gray-400 text-sm">Banned Users</p>
          <p className="text-2xl font-bold text-white">
            {users.filter(u => u.status === 'banned').length}
          </p>
        </div>
      </div>
      
      <div className="bg-[#1E293B] rounded-lg p-6 shadow-lg flex items-center">
        <div className="h-12 w-12 bg-[#D4AF37] rounded-full flex items-center justify-center mr-4">
          <Clock className="h-6 w-6 text-[#0F172A]" />
        </div>
        <div>
          <p className="text-gray-400 text-sm">New Users (24h)</p>
          <p className="text-2xl font-bold text-white">
            {users.filter(u => 
              new Date().getTime() - new Date(u.createdAt).getTime() < 24 * 60 * 60 * 1000
            ).length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardSummary;