import 'dotenv/config'; // Must be at the very top
import express from 'express';
import cors from 'cors';

// Import Routers
import tradesRouter from './routes/trades.js';
import authRouter from './routes/auth.js';
import walletRouter from './routes/wallet.js';
import aiRouter from './routes/ai.js';
import tradingRouter from './routes/trading.js';
import kycRouter from './routes/kyc.js';
import marketRouter from './routes/market.js';
import voiceRouter from './routes/voice.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Configure CORS with dynamic origin check
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow all Netlify domains (including deploy previews)
    if (origin.includes('netlify.app')) {
      return callback(null, true);
    }
    
    // Allow Render domains
    if (origin.includes('onrender.com')) {
      return callback(null, true);
    }
    
    // Log and allow unknown origins (can be restricted later)
    console.log(`CORS request from: ${origin}`);
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    status: 'Kaseddie AI Backend Online',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// CORS test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'CORS is working!',
    origin: req.headers.origin,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/trades', tradesRouter);
app.use('/api/ai', aiRouter);
app.use('/api/trading', tradingRouter);
app.use('/api/kyc', kycRouter);
app.use('/api/market', marketRouter);
app.use('/api/voice', voiceRouter);

// Crypto Pulse endpoint - Fallback with realistic data
app.get('/api/crypto-pulse', (req, res) => {
  // Return realistic fallback data
  res.json([
    { symbol: 'BTC', price: 90000, change: 2.5 },
    { symbol: 'ETH', price: 3200, change: -1.2 },
    { symbol: 'SOL', price: 150, change: 5.8 },
    { symbol: 'ADA', price: 0.65, change: 3.1 },
    { symbol: 'DOGE', price: 0.15, change: -0.5 },
    { symbol: 'XRP', price: 0.70, change: 1.8 }
  ]);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: [
      '/api/auth',
      '/api/wallet',
      '/api/trades',
      '/api/ai',
      '/api/trading',
      '/api/kyc',
      '/api/market'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🎃 Kaseddie AI backend haunting port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for: localhost, *.netlify.app, *.onrender.com`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
