import React, { useState, useEffect } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { SUPPORTED_NETWORKS } from '../../types/Wallet';
import { Wallet, Plus, Import, RefreshCw, ExternalLink } from 'lucide-react';

const WalletManager: React.FC = () => {
  const { 
    accounts,
    selectedAccount,
    selectedNetwork,
    isLoading,
    error,
    createAccount,
    importAccount,
    selectNetwork,
    getBalance
  } = useWallet();

  const [importKey, setImportKey] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refreshBalances();
  }, [selectedNetwork, accounts]);

  const refreshBalances = async () => {
    setRefreshing(true);
    const newBalances: Record<string, string> = {};
    
    for (const address of Object.keys(accounts)) {
      try {
        newBalances[address] = await getBalance(address);
      } catch (error) {
        console.error(`Error fetching balance for ${address}:`, error);
        newBalances[address] = '0.0';
      }
    }
    
    setBalances(newBalances);
    setRefreshing(false);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await importAccount(importKey);
      setImportKey('');
      setShowImport(false);
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  const handleCreateNew = async () => {
    try {
      await createAccount();
    } catch (error) {
      console.error('Create account error:', error);
    }
  };

  const network = SUPPORTED_NETWORKS[selectedNetwork];

  return (
    <div className="bg-[#1E293B] rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <Wallet className="h-6 w-6 mr-2" />
          Crypto Wallets
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(!showImport)}
            className="bg-[#334155] hover:bg-[#475569] text-white px-4 py-2 rounded-lg flex items-center"
          >
            <Import className="h-4 w-4 mr-2" />
            Import
          </button>
          <button
            onClick={handleCreateNew}
            disabled={isLoading}
            className="bg-[#1E5631] hover:bg-[#2D7A47] text-white px-4 py-2 rounded-lg flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg text-red-500">
          {error}
        </div>
      )}

      {showImport && (
        <form onSubmit={handleImport} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={importKey}
              onChange={(e) => setImportKey(e.target.value)}
              placeholder="Enter private key"
              className="flex-1 px-4 py-2 bg-[#0F172A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
            />
            <button
              type="submit"
              className="bg-[#D4AF37] hover:bg-[#E9C85D] text-[#0F172A] px-4 py-2 rounded-lg"
            >
              Import Wallet
            </button>
          </div>
        </form>
      )}

      <div className="mb-6">
        <label className="block text-gray-400 text-sm font-medium mb-2">
          Selected Network
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(SUPPORTED_NETWORKS).map(([key, network]) => (
            <button
              key={key}
              onClick={() => selectNetwork(key)}
              className={`p-2 rounded-lg text-sm font-medium ${
                selectedNetwork === key
                  ? 'bg-[#1E5631] text-white'
                  : 'bg-[#0F172A] text-gray-400 hover:bg-[#334155]'
              }`}
            >
              {network.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(accounts).map(([address, account]) => (
          <div 
            key={address} 
            className={`bg-[#0F172A] rounded-lg p-4 ${
              selectedAccount === address ? 'ring-2 ring-[#D4AF37]' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-white font-medium mb-1">{account.name}</h3>
                <div className="flex items-center">
                  <span className="text-gray-400 text-sm mr-2">Address:</span>
                  <span className="text-white font-mono">
                    {`${address.slice(0, 6)}...${address.slice(-4)}`}
                  </span>
                </div>
              </div>
              <a
                href={`${network.explorer}/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#D4AF37] hover:text-[#E9C85D]"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-gray-400 text-sm mr-2">Balance:</span>
                <span className="text-white">
                  {balances[address] || '0.0'} {network.symbol}
                </span>
              </div>
              <button
                onClick={refreshBalances}
                disabled={refreshing}
                className="text-gray-400 hover:text-white"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        ))}

        {Object.keys(accounts).length === 0 && (
          <div className="text-center py-8 text-gray-400">
            No wallets created yet. Create or import a wallet to get started.
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletManager;