import React from 'react';
import { User } from '../../types/User';

interface EditUserModalProps {
  user: User | null;
  onClose: () => void;
  onSave: (userId: string, userData: Partial<User>) => Promise<void>;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onSave }) => {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-[#1E293B] rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-[#334155]">
          <h2 className="text-2xl font-bold text-white">Edit User</h2>
        </div>
        
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-white text-sm font-bold mb-2">
              Name
            </label>
            <input
              type="text"
              value={user.name}
              onChange={(e) => user.name = e.target.value}
              className="w-full px-3 py-2 bg-[#0F172A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-white text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              value={user.email}
              onChange={(e) => user.email = e.target.value}
              className="w-full px-3 py-2 bg-[#0F172A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-white text-sm font-bold mb-2">
              Role
            </label>
            <select
              value={user.role}
              onChange={(e) => user.role = e.target.value as 'user' | 'admin'}
              className="w-full px-3 py-2 bg-[#0F172A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#334155] text-white rounded-lg hover:bg-[#475569]"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(user.id, user)}
              className="px-4 py-2 bg-[#D4AF37] text-[#0F172A] rounded-lg hover:bg-[#E9C85D]"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditUserModal;