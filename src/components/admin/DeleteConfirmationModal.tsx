import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-[#1E293B] rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-[#334155]">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
        </div>
        
        <div className="p-6">
          <div className="flex items-center mb-6 bg-[#0F172A] p-4 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
            <p className="text-white">{message}</p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#334155] text-white rounded-lg hover:bg-[#475569]"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;