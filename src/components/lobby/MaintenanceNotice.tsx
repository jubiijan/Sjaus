import React from 'react';
import { CheckCircle2, RefreshCcw, Zap } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';

const MaintenanceNotice: React.FC = () => {
  const { connectionStatus, onlinePlayers } = useGame();
  const totalOnline = Object.values(onlinePlayers).flat().length;

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
              {connectionStatus === 'connected' ? 'Connected to Game Server' : 'Connecting to Server...'}
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              {totalOnline} {totalOnline === 1 ? 'player' : 'players'} currently online
            </p>
          </div>
        </div>
        <div className="flex items-center">
          <RefreshCcw 
            className={`h-4 w-4 ${
              connectionStatus === 'connected' 
                ? 'text-[#D4AF37]' 
                : 'text-orange-500'
            } ${
              connectionStatus === 'connected' 
                ? 'animate-spin' 
                : 'animate-pulse'
            } mr-2`} 
          />
          <span className={
            connectionStatus === 'connected'
              ? 'text-[#D4AF37]'
              : 'text-orange-500'
          }>
            {connectionStatus === 'connected' ? 'Live' : 'Connecting...'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceNotice;