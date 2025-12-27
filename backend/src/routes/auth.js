import express from 'express';
import { getAuthorizationUrl, authenticateWithCode } from '../services/authService.js';

const router = express.Router();

// ============================================================================
// Environment-Aware Client URL Configuration
// ============================================================================
// Determines the correct frontend URL based on environment
// - Production: Netlify deployment
// - Development: Local Vite server
// - Override: Custom FRONTEND_URL env variable
// ============================================================================

const CLIENT_URL = process.env.FRONTEND_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://kaseddie-ai-1.netlify.app' 
    : 'http://localhost:5173');

console.log(`[Auth] Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`[Auth] Client URL: ${CLIENT_URL}`);

// GET /api/auth/login - Generate WorkOS authorization URL
router.get('/login', (req, res) => {
  try {
    const authUrl = getAuthorizationUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ 
      error: {
        code: 'WORKOS_ERROR',
        message: 'Failed to generate authentication URL',
        details: error.message
      }
    });
  }
});

// GET /api/auth/callback - Handle WorkOS callback
router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({
      error: {
        code: 'INVALID_REQUEST',
        message: 'Authorization code is required'
      }
    });
  }

  try {
    // Authenticate user with code
    const userData = await authenticateWithCode(code);
    
    // Redirect to frontend with user data (environment-aware)
    const userParam = encodeURIComponent(JSON.stringify(userData));
    const redirectUrl = `${CLIENT_URL}?user=${userParam}`;
    
    console.log(`[Auth] Redirecting to: ${redirectUrl}`);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in auth callback:', error);
    res.status(500).json({
      error: {
        code: 'WORKOS_ERROR',
        message: 'Failed to authenticate user',
        details: error.message
      }
    });
  }
});

// GET /api/auth/profile - Get current user profile
router.get('/profile', (req, res) => {
  // This would normally validate a session token
  // For now, return a mock response
  res.json({
    message: 'Profile endpoint - implement session validation'
  });
});

// POST /api/auth/logout - Logout user
router.post('/logout', (req, res) => {
  res.json({
    message: 'Logged out successfully'
  });
});

export default router;
