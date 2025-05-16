import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { 
  WalletState, 
  SUPPORTED_NETWORKS, 
  Account,
  Token,
  Transaction,
  TOKEN_ABI,
  COMMON_TOKENS
} from '../types/Wallet';

const LOCK_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // 1 minute
const GAS_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

interface WalletContextType extends WalletState {
  createAccount: (name?: string) => Promise<void>;
  importAccount: (privateKey: string, name?: string) => Promise<void>;
  selectAccount: (address: string) => void;
  selectNetwork: (network: string) => void;
  getBalance: (address: string) => Promise<string>;
  sendTransaction: (to: string, amount: string) => Promise<void>;
  addToken: (tokenAddress: string) => Promise<void>;
  removeToken: (tokenAddress: string) => Promise<void>;
  sendToken: (tokenAddress: string, to: string, amount: string) => Promise<void>;
  lock: () => void;
  unlock: (password: string) => Promise<boolean>;
  updatePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WalletState>({
    accounts: {},
    selectedAccount: null,
    selectedNetwork: 'ethereum',
    isLoading: false,
    error: null,
    gasInfo: null,
    isLocked: true,
    lastActivity: Date.now()
  });

  // Load accounts from encrypted storage
  useEffect(() => {
    const savedAccounts = localStorage.getItem('encrypted_accounts');
    if (savedAccounts) {
      setState(prev => ({
        ...prev,
        accounts: JSON.parse(savedAccounts)
      }));
    }
  }, []);

  // Auto-lock timer
  useEffect(() => {
    const checkActivity = () => {
      const now = Date.now();
      if (!state.isLocked && now - state.lastActivity > LOCK_TIMEOUT) {
        lock();
      }
    };

    const interval = setInterval(checkActivity, ACTIVITY_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [state.isLocked, state.lastActivity]);

  // Gas price updates
  useEffect(() => {
    const updateGasInfo = async () => {
      try {
        const network = SUPPORTED_NETWORKS[state.selectedNetwork];
        const provider = new ethers.JsonRpcProvider(network.rpcUrl);
        const feeData = await provider.getFeeData();
        
        setState(prev => ({
          ...prev,
          gasInfo: {
            slow: ethers.formatUnits(feeData.gasPrice! * BigInt(80) / BigInt(100), 'gwei'),
            standard: ethers.formatUnits(feeData.gasPrice!, 'gwei'),
            fast: ethers.formatUnits(feeData.gasPrice! * BigInt(120) / BigInt(100), 'gwei'),
            instant: ethers.formatUnits(feeData.gasPrice! * BigInt(150) / BigInt(100), 'gwei'),
            lastUpdated: Date.now()
          }
        }));
      } catch (error) {
        console.error('Failed to update gas info:', error);
      }
    };

    updateGasInfo();
    const interval = setInterval(updateGasInfo, GAS_UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, [state.selectedNetwork]);

  const saveAccounts = (accounts: Record<string, Account>) => {
    localStorage.setItem('encrypted_accounts', JSON.stringify(accounts));
    setState(prev => ({ ...prev, accounts }));
  };

  const createAccount = async (name?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const wallet = ethers.Wallet.createRandom();
      const account: Account = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic?.phrase,
        name: name || `Account ${Object.keys(state.accounts).length + 1}`,
        tokens: {},
        transactions: []
      };
      
      const newAccounts = {
        ...state.accounts,
        [wallet.address]: account
      };
      
      saveAccounts(newAccounts);
      
      if (!state.selectedAccount) {
        setState(prev => ({ ...prev, selectedAccount: wallet.address }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create account'
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const importAccount = async (privateKey: string, name?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const wallet = new ethers.Wallet(privateKey);
      const account: Account = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        name: name || `Account ${Object.keys(state.accounts).length + 1}`,
        tokens: {},
        transactions: []
      };
      
      const newAccounts = {
        ...state.accounts,
        [wallet.address]: account
      };
      
      saveAccounts(newAccounts);
      
      if (!state.selectedAccount) {
        setState(prev => ({ ...prev, selectedAccount: wallet.address }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to import account'
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const selectAccount = (address: string) => {
    if (state.accounts[address]) {
      setState(prev => ({ 
        ...prev, 
        selectedAccount: address,
        lastActivity: Date.now()
      }));
    }
  };

  const selectNetwork = (network: string) => {
    if (SUPPORTED_NETWORKS[network]) {
      setState(prev => ({ 
        ...prev, 
        selectedNetwork: network,
        lastActivity: Date.now()
      }));
    }
  };

  const getBalance = async (address: string): Promise<string> => {
    const network = SUPPORTED_NETWORKS[state.selectedNetwork];
    const provider = new ethers.JsonRpcProvider(network.rpcUrl);
    
    try {
      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error fetching balance:', error);
      return '0.0';
    }
  };

  const sendTransaction = async (to: string, amount: string) => {
    if (!state.selectedAccount) throw new Error('No account selected');
    
    const account = state.accounts[state.selectedAccount];
    const network = SUPPORTED_NETWORKS[state.selectedNetwork];
    const provider = new ethers.JsonRpcProvider(network.rpcUrl);
    const wallet = new ethers.Wallet(account.privateKey, provider);
    
    try {
      const tx = await wallet.sendTransaction({
        to,
        value: ethers.parseEther(amount)
      });
      
      const newTransaction: Transaction = {
        hash: tx.hash,
        from: account.address,
        to,
        value: amount,
        timestamp: Date.now(),
        status: 'pending'
      };
      
      const updatedAccount = {
        ...account,
        transactions: [newTransaction, ...account.transactions]
      };
      
      saveAccounts({
        ...state.accounts,
        [account.address]: updatedAccount
      });
      
      await tx.wait();
      
      // Update transaction status
      updatedAccount.transactions[0].status = 'confirmed';
      saveAccounts({
        ...state.accounts,
        [account.address]: updatedAccount
      });
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Transaction failed');
    }
  };

  const addToken = async (tokenAddress: string) => {
    if (!state.selectedAccount) throw new Error('No account selected');
    
    const account = state.accounts[state.selectedAccount];
    const network = SUPPORTED_NETWORKS[state.selectedNetwork];
    const provider = new ethers.JsonRpcProvider(network.rpcUrl);
    
    try {
      const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, provider);
      const [decimals, symbol, name, balance] = await Promise.all([
        tokenContract.decimals(),
        tokenContract.symbol(),
        tokenContract.name(),
        tokenContract.balanceOf(account.address)
      ]);
      
      const token: Token = {
        address: tokenAddress,
        symbol,
        decimals,
        name,
        balance: ethers.formatUnits(balance, decimals)
      };
      
      const updatedAccount = {
        ...account,
        tokens: {
          ...account.tokens,
          [tokenAddress]: token
        }
      };
      
      saveAccounts({
        ...state.accounts,
        [account.address]: updatedAccount
      });
    } catch (error) {
      throw new Error('Failed to add token');
    }
  };

  const removeToken = async (tokenAddress: string) => {
    if (!state.selectedAccount) throw new Error('No account selected');
    
    const account = state.accounts[state.selectedAccount];
    const { [tokenAddress]: _, ...remainingTokens } = account.tokens;
    
    const updatedAccount = {
      ...account,
      tokens: remainingTokens
    };
    
    saveAccounts({
      ...state.accounts,
      [account.address]: updatedAccount
    });
  };

  const sendToken = async (tokenAddress: string, to: string, amount: string) => {
    if (!state.selectedAccount) throw new Error('No account selected');
    
    const account = state.accounts[state.selectedAccount];
    const token = account.tokens[tokenAddress];
    if (!token) throw new Error('Token not found');
    
    const network = SUPPORTED_NETWORKS[state.selectedNetwork];
    const provider = new ethers.JsonRpcProvider(network.rpcUrl);
    const wallet = new ethers.Wallet(account.privateKey, provider);
    const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, wallet);
    
    try {
      const tx = await tokenContract.transfer(
        to,
        ethers.parseUnits(amount, token.decimals)
      );
      
      const newTransaction: Transaction = {
        hash: tx.hash,
        from: account.address,
        to,
        value: amount,
        timestamp: Date.now(),
        status: 'pending'
      };
      
      const updatedAccount = {
        ...account,
        transactions: [newTransaction, ...account.transactions]
      };
      
      saveAccounts({
        ...state.accounts,
        [account.address]: updatedAccount
      });
      
      await tx.wait();
      
      // Update transaction status and token balance
      const newBalance = await tokenContract.balanceOf(account.address);
      updatedAccount.transactions[0].status = 'confirmed';
      updatedAccount.tokens[tokenAddress].balance = ethers.formatUnits(
        newBalance,
        token.decimals
      );
      
      saveAccounts({
        ...state.accounts,
        [account.address]: updatedAccount
      });
    } catch (error) {
      throw new Error('Token transfer failed');
    }
  };

  const lock = () => {
    setState(prev => ({ ...prev, isLocked: true }));
  };

  const unlock = async (password: string): Promise<boolean> => {
    // In a real implementation, this would decrypt the stored accounts
    setState(prev => ({ 
      ...prev, 
      isLocked: false,
      lastActivity: Date.now()
    }));
    return true;
  };

  const updatePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    // In a real implementation, this would re-encrypt the stored accounts
    setState(prev => ({ ...prev, lastActivity: Date.now() }));
    return true;
  };

  const value = {
    ...state,
    createAccount,
    importAccount,
    selectAccount,
    selectNetwork,
    getBalance,
    sendTransaction,
    addToken,
    removeToken,
    sendToken,
    lock,
    unlock,
    updatePassword
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};