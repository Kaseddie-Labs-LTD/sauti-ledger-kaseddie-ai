import { getById, updateUserWallet } from '../models/db.js';

// Stripe is blocked - using mock implementation

/**
 * Create a mock deposit (Stripe blocked - using mock)
 * @param {string} userId - User ID
 * @param {number} amount - Amount to deposit in USD (ignored, always adds $10,000)
 * @returns {Promise<Object>} Mock deposit result
 */
export async function createDepositIntent(userId, amount) {
  // Mock deposit - add $10,000 to user's wallet
  const user = getById('users', userId);
  if (!user) {
    throw new Error('User not found');
  }

  const depositAmount = 10000; // Always deposit $10,000
  const newBalance = user.walletBalance + depositAmount;
  const updatedUser = updateUserWallet(userId, newBalance);

  return {
    success: true,
    newBalance: updatedUser.walletBalance,
    depositAmount,
    message: 'Mock deposit successful (Stripe blocked)'
  };
}

/**
 * Process withdrawal from user wallet (mock - Stripe blocked)
 * @param {string} userId - User ID
 * @param {number} amount - Amount to withdraw in USD
 * @returns {Promise<Object>} Withdrawal result
 */
export async function processWithdrawal(userId, amount) {
  if (amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  // Get user from database
  const user = getById('users', userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Check sufficient funds
  if (user.walletBalance < amount) {
    throw new Error('Insufficient funds for withdrawal');
  }

  // Mock withdrawal - just update balance
  const newBalance = user.walletBalance - amount;
  const updatedUser = updateUserWallet(userId, newBalance);

  return {
    success: true,
    newBalance: updatedUser.walletBalance,
    withdrawAmount: amount,
    payoutId: 'mock_payout_' + Date.now(),
    message: 'Mock withdrawal successful (Stripe blocked)'
  };
}

/**
 * Get user wallet balance
 * @param {string} userId - User ID
 * @returns {number} Current balance
 */
export function getBalance(userId) {
  const user = getById('users', userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user.walletBalance;
}

/**
 * Get transaction history for user
 * @param {string} userId - User ID
 * @returns {Array} Transaction history
 */
export function getTransactionHistory(userId) {
  const user = getById('users', userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // TODO: Implement transaction history tracking in database
  // For now, return empty array
  return [];
}
