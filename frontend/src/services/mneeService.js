/**
 * MNEE Token Service
 * Provides functions for reading MNEE balance and interacting with the MNEE contract
 */

import { useReadContract, useAccount, useBlockNumber, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits } from 'viem';
import { MNEE_CONTRACT_ADDRESS, MNEE_CONTRACT_ABI } from '../contracts/mneeToken';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query'; // ← NEW IMPORT

/**
 * Custom hook to read MNEE token balance for the connected wallet
 * Includes automatic refresh on block changes and manual refresh capability
 * 
 * @returns {Object} Balance data and control functions
 * @property {string} balance - Formatted balance (e.g., "100.5")
 * @property {bigint} balanceRaw - Raw balance in wei
 * @property {boolean} isLoading - Whether balance is being fetched
 * @property {boolean} isError - Whether an error occurred
 * @property {Error} error - Error object if fetch failed
 * @property {Function} refetch - Function to manually refresh balance
 * @property {string} symbol - Token symbol (MNEE)
 */
export function useMNEEBalance() {
  const { address, isConnected } = useAccount();
  const [lastRefresh, setLastRefresh] = useState(0);
  
  // Read balance from contract
  const {
    data: balanceRaw,
    isLoading,
    isError,
    error,
    refetch: refetchBalance,
  } = useReadContract({
    address: MNEE_CONTRACT_ADDRESS,
    abi: MNEE_CONTRACT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    enabled: isConnected && !!address,
  });

  // Get current block number for auto-refresh
  const { data: blockNumber } = useBlockNumber({
    watch: true, // Watch for new blocks
  });

  // Auto-refresh balance when new block is mined
  useEffect(() => {
    if (blockNumber && isConnected) {
      refetchBalance();
    }
  }, [blockNumber, isConnected, refetchBalance]);

  // Format balance for display
  const balance = balanceRaw ? formatUnits(balanceRaw, 18) : '0';

  // Manual refresh function with timestamp tracking
  const refetch = async () => {
    setLastRefresh(Date.now());
    return await refetchBalance();
  };

  return {
    balance,
    balanceRaw: balanceRaw || 0n,
    isLoading,
    isError,
    error,
    refetch,
    symbol: 'MNEE',
    lastRefresh,
  };
}

/**
 * Custom hook to read MNEE token decimals
 * 
 * @returns {Object} Decimals data
 * @property {number} decimals - Number of decimals (usually 18)
 * @property {boolean} isLoading - Whether decimals are being fetched
 * @property {boolean} isError - Whether an error occurred
 */
export function useMNEEDecimals() {
  const {
    data: decimals,
    isLoading,
    isError,
  } = useReadContract({
    address: MNEE_CONTRACT_ADDRESS,
    abi: MNEE_CONTRACT_ABI,
    functionName: 'decimals',
  });

  return {
    decimals: decimals || 18,
    isLoading,
    isError,
  };
}

/**
 * Custom hook to read MNEE token symbol
 * 
 * @returns {Object} Symbol data
 * @property {string} symbol - Token symbol
 * @property {boolean} isLoading - Whether symbol is being fetched
 * @property {boolean} isError - Whether an error occurred
 */
export function useMNEESymbol() {
  const {
    data: symbol,
    isLoading,
    isError,
  } = useReadContract({
    address: MNEE_CONTRACT_ADDRESS,
    abi: MNEE_CONTRACT_ABI,
    functionName: 'symbol',
  });

  return {
    symbol: symbol || 'MNEE',
    isLoading,
    isError,
  };
}

/**
 * Utility function to format MNEE amount from wei to human-readable format
 * 
 * @param {bigint} amount - Amount in wei
 * @param {number} decimals - Number of decimals (default: 18)
 * @returns {string} Formatted amount
 */
export function formatMNEEAmount(amount, decimals = 18) {
  if (!amount) return '0';
  return formatUnits(amount, decimals);
}

/**
 * Utility function to parse MNEE amount from human-readable to wei
 * 
 * @param {string} amount - Human-readable amount (e.g., "100.5")
 * @param {number} decimals - Number of decimals (default: 18)
 * @returns {bigint} Amount in wei
 */
export function parseMNEEAmount(amount, decimals = 18) {
  if (!amount) return 0n;
  // Convert to wei by multiplying by 10^decimals
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole + paddedFraction);
}

/**
 * Custom hook to transfer MNEE tokens
 * Handles transaction signing, submission, and monitoring
 * 
 * @returns {Object} Transfer functions and status
 * @property {Function} transfer - Function to initiate transfer (recipient, amount in wei)
 * @property {string} transactionHash - Transaction hash once submitted
 * @property {boolean} isPending - Whether transaction is being signed/submitted
 * @property {boolean} isConfirming - Whether transaction is pending on blockchain
 * @property {boolean} isConfirmed - Whether transaction is confirmed on blockchain
 * @property {boolean} isError - Whether an error occurred
 * @property {Error} error - Error object if transaction failed
 * @property {Object} receipt - Transaction receipt once confirmed
 */
export function useMNEETransfer() {
  const { 
    data: hash,
    isPending,
    isError: isWriteError,
    error: writeError,
    writeContract 
  } = useWriteContract();

  // Monitor transaction status
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    isError: isReceiptError,
    error: receiptError,
    data: receipt 
  } = useWaitForTransactionReceipt({
    hash,
  });

  const queryClient = useQueryClient(); // ← NEW: Get query client

  // NEW: Automatically refresh balance after successful transaction
  useEffect(() => {
    if (isConfirmed) {
      queryClient.invalidateQueries({
        queryKey: ['readContract', {
          address: MNEE_CONTRACT_ADDRESS,
          functionName: 'balanceOf',
        }],
      });
    }
  }, [isConfirmed, queryClient]);

  /**
   * Execute MNEE transfer
   * @param {string} to - Recipient address
   * @param {bigint} amount - Amount in wei
   */
  const transfer = (to, amount) => {
    writeContract({
      address: MNEE_CONTRACT_ADDRESS,
      abi: MNEE_CONTRACT_ABI,
      functionName: 'transfer',
      args: [to, amount],
    });
  };

  return {
    transfer,
    transactionHash: hash,
    isPending,
    isConfirming,
    isConfirmed,
    isError: isWriteError || isReceiptError,
    error: writeError || receiptError,
    receipt,
  };
}