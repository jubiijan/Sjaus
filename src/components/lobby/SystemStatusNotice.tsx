import React from 'react';
import { AlertTriangle, Wrench, ArrowRight } from 'lucide-react';

const SystemStatusNotice: React.FC = () => {
  return (
    <div className="mb-8 bg-gradient-to-r from-[#8B4513]/10 to-[#A65C2E]/10 rounded-lg p-4 border border-[#8B4513]/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-[#8B4513]/20 p-2 rounded-full">
            <Wrench className="h-5 w-5 text-[#A65C2E]" />
          </div>
          <div>
            <h3 className="text-white font-medium flex items-center">
              <AlertTriangle className="h-4 w-4 text-[#D4AF37] mr-2" />
              System Improvements in Progress
            </h3>
            <div className="text-gray-400 text-sm mt-1">
              <p>Currently working on:</p>
              <ul className="list-disc list-inside ml-2 mt-1">
                <li>Creating new game sessions</li>
                <li>Joining existing games</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="flex items-center">
          <ArrowRight className="h-4 w-4 text-[#D4AF37] animate-pulse" />
          <span className="text-[#D4AF37] text-sm ml-2">Active</span>
        </div>
      </div>
    </div>
  );
};

export default SystemStatusNotice;