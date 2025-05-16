import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

const SyncNotice: React.FC = () => {
  return (
    <div className="mb-8 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-lg p-4 border border-red-500/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-red-500/20 p-2 rounded-full">
            <WifiOff className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-white font-medium flex items-center">
              Synchronization Issues
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              Game updates may be delayed. Please refresh manually if you don't see new games.
            </p>
          </div>
        </div>
        <div className="flex items-center">
          <RefreshCw className="h-4 w-4 text-orange-500 animate-spin mr-2" />
          <span className="text-orange-500 text-sm">Fixing...</span>
        </div>
      </div>
    </div>
  );
};

export default SyncNotice;