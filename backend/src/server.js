import 'dotenv/config'; // Must be at the very top
import express from 'express';
import cors from 'cors';

// Import only the voice router (for /transcribe and /parse)
import voiceRouter from './routes/voice.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Configure CORS - allow frontend origins only (secure)
const corsOptions = {
  origin: [
    'http://localhost:5173',           // Local Vite dev
    'http://localhost:3000',           // Local backend test
    /https:\/\/.*\.vercel\.app/,       // All Vercel previews
    /https:\/\/.*\.netlify\.app/       // Netlify previews (if used)
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '50mb' })); // Allow larger audio uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Simple request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Root route - simple status
app.get('/', (req, res) => {
  res.json({ 
    status: 'Sauti Ledger Backend Online',
    feature: 'Voice-Powered MNEE Transfers',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Only voice route (transcribe + parse)
app.use('/api/voice', voiceRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: ['/api/voice/transcribe', '/api/voice/parse']
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎤 Sauti Ledger Backend running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Allowed origins: localhost, vercel.app previews`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received: closing server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received: closing server');
  process.exit(0);
});