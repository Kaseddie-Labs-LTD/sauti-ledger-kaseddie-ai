/**
 * API & Contract Configuration
 * Automatically detects environment and sets appropriate backend URL
 * - Production: Uses hosted backend (e.g. Render)
 * - Development: Uses local backend
 * - Supports Vite/Netlify/Vercel env vars
 */

// === ENVIRONMENT DETECTION ===
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1';

const isProduction = !isLocal;

// === API BASE URL ===
export const API_BASE = isProduction
  ? import.meta.env.VITE_API_BASE_URL || 'https://kaseddie-ai.onrender.com'  // Production backend
  : 'http://localhost:3000';                                               // Local dev backend

// Log config (only in development)
if (import.meta.env.DEV) {
  console.log('🌍 Environment:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
  console.log('🔗 API Base URL:', API_BASE);
}

/**
 * Helper to build full API URLs safely
 * @param {string} path - Endpoint path (e.g. 'api/voice/transcribe' or '/api/parse')
 * @returns {string} Complete URL
 */
export function getApiUrl(path = '') {
  // Normalize path: ensure it starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Remove trailing slash from base if present
  const cleanBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  
  return `${cleanBase}${normalizedPath}`;
}

// === MNEE TOKEN CONTRACT ===
export const MNEE_CONTRACT_ADDRESS = import.meta.env.VITE_MNEE_CONTRACT_ADDRESS || 
  '0x8c8F8E4F8e4F8e4F8e4F8e4F8e4F8e4F8e4F8e4F';  // Fallback: replace with real address!

// Optional: Chain ID (Sepolia testnet = 11155111)
export const CHAIN_ID = import.meta.env.VITE_CHAIN_ID || 11155111;

// Log contract info in dev
if (import.meta.env.DEV) {
  console.log('💰 MNEE Contract:', MNEE_CONTRACT_ADDRESS);
  console.log('⛓️ Chain ID:', CHAIN_ID);
}

// === EXPORTS ===
export default {
  API_BASE,
  getApiUrl,
  MNEE_CONTRACT_ADDRESS,
  CHAIN_ID,
  isProduction,
  isLocal
};