/**
 * API Configuration
 * Automatically detects environment and uses appropriate backend URL
 * - Production (Netlify): Uses Render backend
 * - Development (localhost): Uses local backend
 */

// Detect environment and set appropriate API base URL
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

export const API_BASE = isProduction 
  ? 'https://kaseddie-ai.onrender.com'  // Production: Render backend
  : 'http://localhost:3000';             // Development: Local backend

// Log configuration for debugging
console.log('🌍 Environment:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
console.log('🔗 API Base URL:', API_BASE);

/**
 * Helper function to construct full API URLs
 * @param {string} path - API endpoint path (e.g., '/api/trades' or 'api/trades')
 * @returns {string} Full API URL
 */
export function getApiUrl(path) {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Remove trailing slash from base URL if present
  const baseUrl = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  
  return `${baseUrl}${normalizedPath}`;
}

// Log the API base URL in development
if (import.meta.env.DEV) {
  console.log('🔗 API Base URL:', API_BASE);
}

/**
 * MNEE Token Contract Configuration
 */
export const MNEE_CONTRACT_ADDRESS = import.meta.env.VITE_MNEE_CONTRACT_ADDRESS || '0x8c8F8E4F8e4F8e4F8e4F8e4F8e4F8e4F8e4F8e4F';
