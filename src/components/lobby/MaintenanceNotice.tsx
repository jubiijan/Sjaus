import React from 'react';
import { Wifi, RefreshCcw, Users } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';

const MaintenanceNotice: React.FC = () => {
  const { connectionStatus, onlinePlayers } = useGame();
  const totalOnline = Object.values(onlinePlayers).flat().length;

  return (
    <div className="mb-8 bg-gradient-to-r from-[#1E5631]/10 to-[#2D7A47]/10 rounded-lg p-4 border border-[#1E5631]/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-[#1E5631]/20 p-2 rounded-full">
            <Wifi 
              className={`h-5 w-5 ${
                connectionStatus === 'connected' 
                  ? 'text-green-500 animate-pulse' 
                  : 'text-orange-500'
              }`} 
            />
          </div>
          <div>
            <h3 className="text-white font-medium flex items-center">
              {connectionStatus === 'connected' ? (
                <>
                  <span className="text-green-500">●</span>
                  <span className="ml-2">Game Server Synced and Ready</span>
                </>
              ) : (
                'Establishing Connection...'
              )}
            </h3>
            <p className="text-gray-400 text-sm mt-1 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              {totalOnline} {totalOnline === 1 ? 'player' : 'players'} in the game universe
            </p>
          </div>
        </div>
        <div className="flex items-center">
          <RefreshCcw 
            className={`h-4 w-4 ${
              connectionStatus === 'connected' 
                ? 'text-green-500 animate-spin' 
                : 'text-orange-500 animate-pulse'
            } mr-2`} 
          />
          <span className={
            connectionStatus === 'connected'
              ? 'text-green-500'
              : 'text-orange-500'
          }>
            {connectionStatus === 'connected' ? 'Synchronized' : 'Syncing...'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceNotice;