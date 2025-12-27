/**
 * Wagmi Configuration
 * Sets up Web3 wallet connectivity using RainbowKit and Wagmi
 */

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, base, baseSepolia } from 'wagmi/chains';

/**
 * Wagmi configuration for the application
 * Supports Ethereum mainnet (for MNEE token), Base mainnet and Base Sepolia testnet
 */
export const wagmiConfig = getDefaultConfig({
  appName: 'Sauti Ledger Kaseddie AI - Voice MNEE Transfer',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID, // Loads from .env
  chains: [mainnet, base, baseSepolia],
  ssr: false, // Not using server-side rendering
});