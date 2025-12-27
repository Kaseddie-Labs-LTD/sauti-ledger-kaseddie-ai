# Kaseddie AI Backend - Deployment Guide

## Current Issues & Solutions

### CORS Errors in Production

The backend has been updated with comprehensive CORS handling:

1. **Dynamic origin checking** - Allows localhost, Netlify, and Render domains
2. **Explicit OPTIONS handling** - Preflight requests are handled correctly
3. **Extended headers** - All necessary headers are allowed
4. **Request logging** - All requests are logged for debugging

### Render Deployment Checklist

1. **Environment Variables** - Ensure all required env vars are set in Render dashboard:
   - `PORT` (usually auto-set by Render)
   - `NODE_ENV=production`
   - `GOOGLE_APPLICATION_CREDENTIALS_JSON` (your service account JSON as string)
   - `ELEVENLABS_API_KEY`
   - `WORKOS_API_KEY`
   - `WORKOS_CLIENT_ID`
   - `BINANCE_API_KEY`
   - `BINANCE_API_SECRET`

2. **Build Command**: `npm install`

3. **Start Command**: `npm start`

4. **Node Version**: Ensure you're using Node 18+ (set in Render dashboard)

### Testing the Deployment

Once deployed, test these endpoints:

```bash
# Health check
curl https://kaseddie-api.onrender.com/health

# CORS test
curl https://kaseddie-api.onrender.com/api/test

# Market prices
curl https://kaseddie-api.onrender.com/api/market/prices
```

### Common Issues

**404 Errors**: 
- Check that the server is actually running on Render
- Check Render logs for startup errors
- Verify the start command is `npm start`

**CORS Errors**:
- The updated server.js should fix this
- Verify the frontend is using the correct API URL
- Check browser console for the exact origin being sent

**Timeout Errors**:
- Render free tier may spin down after inactivity
- First request after spin-down can take 30-60 seconds
- Consider upgrading to paid tier for always-on service

### Debugging

Check Render logs for:
1. Server startup message: "🎃 Kaseddie AI backend haunting port..."
2. Request logs showing incoming requests
3. Any error messages during startup

If routes are returning 404, the server might not be starting correctly. Check for:
- Missing dependencies
- Environment variable issues
- Import/export errors in ES modules
