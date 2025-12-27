import { WorkOS } from '@workos-inc/node';
import { findUserByEmail, createUser, getById } from '../models/db.js';
import { v4 as uuidv4 } from 'uuid';

// Lazy-load WorkOS client to ensure .env is loaded first
let workos = null;

function getWorkOSClient() {
  if (!workos) {
    if (!process.env.WORKOS_API_KEY || process.env.WORKOS_API_KEY === 'placeholder') {
      throw new Error('WorkOS API key not configured');
    }
    workos = new WorkOS(process.env.WORKOS_API_KEY);
  }
  return workos;
}

/**
 * Generate WorkOS authorization URL
 * @returns {string} Authorization URL
 */
export function getAuthorizationUrl() {
  const client = getWorkOSClient();
  return client.userManagement.getAuthorizationUrl({
    clientId: process.env.WORKOS_CLIENT_ID,
    redirectUri: process.env.WORKOS_REDIRECT_URI,
    provider: 'authkit'
  });
}

/**
 * Authenticate user with authorization code
 * @param {string} code - Authorization code from WorkOS
 * @returns {Promise<Object>} User data
 */
export async function authenticateWithCode(code) {
  // Real WorkOS authentication
  const client = getWorkOSClient();
  const { user } = await client.userManagement.authenticateWithCode({
    clientId: process.env.WORKOS_CLIENT_ID,
    code
  });

  // Check if user exists in database
  let dbUser = findUserByEmail(user.email);

  // Create new user if doesn't exist
  if (!dbUser) {
    dbUser = createUser({
      id: uuidv4(),
      email: user.email,
      workosUserId: user.id,
      kycStatus: 'pending',
      walletBalance: 0,
      activeStrategy: null,
      stripeCustomerId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    kycStatus: dbUser.kycStatus,
    walletBalance: dbUser.walletBalance,
    activeStrategy: dbUser.activeStrategy
  };
}

/**
 * Get user profile by ID
 * @param {string} userId - User ID
 * @returns {Object|null} User profile or null
 */
export function getUserProfile(userId) {
  const user = getById('users', userId);
  
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    kycStatus: user.kycStatus,
    walletBalance: user.walletBalance,
    activeStrategy: user.activeStrategy
  };
}
