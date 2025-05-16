import { ethers } from 'ethers';

export interface Token {
  address: string;
  symbol: string;
  decimals: number;
  balance: string;
  name: string;
  logo?: string;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  gasUsed?: string;
  gasPrice?: string;
}

export interface Account {
  address: string;
  privateKey: string;
  mnemonic?: string;
  name: string;
  tokens: Record<string, Token>;
  transactions: Transaction[];
}

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  symbol: string;
  explorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: 18
  };
  blockExplorerUrls: string[];
  iconUrl?: string;
}

export interface GasInfo {
  slow: string;
  standard: string;
  fast: string;
  instant: string;
  lastUpdated: number;
}

export interface WalletState {
  accounts: Record<string, Account>;
  selectedAccount: string | null;
  selectedNetwork: string;
  isLoading: boolean;
  error: string | null;
  gasInfo: GasInfo | null;
  isLocked: boolean;
  lastActivity: number;
}

export const SUPPORTED_NETWORKS: Record<string, NetworkConfig> = {
  ethereum: {
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    symbol: 'ETH',
    explorer: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrls: ['https://etherscan.io'],
    iconUrl: 'https://ethereum.org/static/eth-diamond-purple-1.svg'
  },
  bsc: {
    name: 'BNB Smart Chain',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    symbol: 'BNB',
    explorer: 'https://bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    },
    blockExplorerUrls: ['https://bscscan.com'],
    iconUrl: 'https://bin.bnbstatic.com/static/images/common/bnb.png'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    symbol: 'ARB',
    explorer: 'https://arbiscan.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrls: ['https://arbiscan.io'],
    iconUrl: 'https://arbitrum.io/assets/logo.png'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    symbol: 'MATIC',
    explorer: 'https://polygonscan.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    blockExplorerUrls: ['https://polygonscan.com'],
    iconUrl: 'https://polygon.technology/favicon.ico'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
    symbol: 'OP',
    explorer: 'https://optimistic.etherscan.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrls: ['https://optimistic.etherscan.io'],
    iconUrl: 'https://optimism.io/favicon.ico'
  },
  avalanche: {
    name: 'Avalanche',
    chainId: 43114,
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    symbol: 'AVAX',
    explorer: 'https://snowtrace.io',
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18
    },
    blockExplorerUrls: ['https://snowtrace.io'],
    iconUrl: 'https://www.avax.network/favicon.ico'
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    symbol: 'ETH',
    explorer: 'https://basescan.org',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrls: ['https://basescan.org'],
    iconUrl: 'https://base.org/favicon.ico'
  },
  pulsechain: {
    name: 'PulseChain',
    chainId: 369,
    rpcUrl: 'https://rpc.pulsechain.com',
    symbol: 'PLS',
    explorer: 'https://scan.pulsechain.com',
    nativeCurrency: {
      name: 'PulseChain',
      symbol: 'PLS',
      decimals: 18
    },
    blockExplorerUrls: ['https://scan.pulsechain.com'],
    iconUrl: 'https://pulsechain.com/favicon.ico'
  }
};

export const COMMON_TOKENS: Record<number, Token[]> = {
  1: [ // Ethereum
    {
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      symbol: 'USDT',
      decimals: 6,
      name: 'Tether USD',
      balance: '0',
      logo: 'https://assets.coingecko.com/coins/images/325/small/Tether.png'
    },
    {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      symbol: 'USDC',
      decimals: 6,
      name: 'USD Coin',
      balance: '0',
      logo: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png'
    }
  ],
  56: [ // BSC
    {
      address: '0x55d398326f99059fF775485246999027B3197955',
      symbol: 'USDT',
      decimals: 18,
      name: 'Tether USD',
      balance: '0',
      logo: 'https://assets.coingecko.com/coins/images/325/small/Tether.png'
    }
  ]
};

export const TOKEN_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function transfer(address to, uint amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint amount)'
];