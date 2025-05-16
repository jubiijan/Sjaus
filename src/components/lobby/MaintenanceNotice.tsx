import React from 'react';
import { CheckCircle2, RefreshCcw, Zap } from 'lucide-react';

const MaintenanceNotice: React.FC = () => {
  return (
    <div className="mb-8 bg-gradient-to-r from-[#1E5631]/10 to-[#2D7A47]/10 rounded-lg p-4 border border-[#1E5631]/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-[#1E5631]/20 p-2 rounded-full">
            <Zap className="h-5 w-5 text-[#2D7A47]" />
          </div>
          <div>
            <h3 className="text-white font-medium flex items-center">
              <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
              Real-time Synchronization Active
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              All game updates are instantly synchronized across all players
            </p>
          </div>
        </div>
        <div className="flex items-center">
          <RefreshCcw className="h-4 w-4 text-[#D4AF37] animate-spin mr-2" />
          <span className="text-[#D4AF37] text-sm">Live</span>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceNotice;