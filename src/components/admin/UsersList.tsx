import React from 'react';
import { User } from '../../types/User';
import { Edit, Ban, Trash2, CheckCircle, Shield, User as UserIcon, Clock } from 'lucide-react';

interface UsersListProps {
  users: User[];
  onEdit: (user: User) => void;
  onBan: (userId: string) => void;
  onUnban: (userId: string) => void;
  onDelete: (userId: string) => void;
  onToggleAdmin: (userId: string, isAdmin: boolean) => void;
  currentUserId: string;
  isUserActive: (user: User) => boolean;
}

const UsersList: React.FC<UsersListProps> = ({
  users,
  onEdit,
  onBan,
  onUnban,
  onDelete,
  onToggleAdmin,
  currentUserId,
  isUserActive
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="bg-[#0F172A] text-left">
            <th className="py-3 px-4 text-gray-400 font-medium">User</th>
            <th className="py-3 px-4 text-gray-400 font-medium">Email</th>
            <th className="py-3 px-4 text-gray-400 font-medium">Role</th>
            <th className="py-3 px-4 text-gray-400 font-medium">Status</th>
            <th className="py-3 px-4 text-gray-400 font-medium">Games</th>
            <th className="py-3 px-4 text-gray-400 font-medium">Rating</th>
            <th className="py-3 px-4 text-gray-400 font-medium">Last Active</th>
            <th className="py-3 px-4 text-gray-400 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#334155]">
          {users.map(user => {
            const isCurrentUser = user.id === currentUserId;
            const isAdmin = user.role === 'admin';
            const active = isUserActive(user);
            
            return (
              <tr key={user.id} className="hover:bg-[#334155]">
                <td className="py-3 px-4">
                  <div className="flex items-center">
                    <div className="relative">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-8 h-8 rounded-full mr-3"
                      />
                      {active && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1E293B]"></div>
                      )}
                    </div>
                    <span className="text-white">{user.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-white">{user.email}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isAdmin
                      ? 'bg-purple-500 bg-opacity-20 text-purple-400'
                      : 'bg-blue-500 bg-opacity-20 text-blue-400'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.status === 'active'
                      ? 'bg-green-500 bg-opacity-20 text-green-400'
                      : 'bg-red-500 bg-opacity-20 text-red-400'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-white">
                  {user.gamesWon}/{user.gamesPlayed}
                </td>
                <td className="py-3 px-4 text-white">{user.rating}</td>
                <td className="py-3 px-4 text-gray-300">
                  <div className="flex items-center">
                    <Clock className={`h-4 w-4 mr-2 ${active ? 'text-green-400' : 'text-gray-500'}`} />
                    {formatDate(user.last_login || user.createdAt)}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex space-x-2">
                    {!isCurrentUser && (
                      <>
                        <button
                          onClick={() => onToggleAdmin(user.id, !isAdmin)}
                          className={`${
                            isAdmin ? 'text-purple-400 hover:text-purple-300' : 'text-gray-400 hover:text-gray-300'
                          }`}
                          title={isAdmin ? 'Remove admin rights' : 'Make admin'}
                        >
                          <Shield className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onEdit(user)}
                          className="text-blue-400 hover:text-blue-300"
                          title="Edit user"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {user.status === 'active' ? (
                          <button
                            onClick={() => onBan(user.id)}
                            className="text-red-400 hover:text-red-300"
                            title="Ban user"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => onUnban(user.id)}
                            className="text-green-400 hover:text-green-300"
                            title="Unban user"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(user.id)}
                          className="text-red-400 hover:text-red-300"
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default UsersList;