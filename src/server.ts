// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import compression from 'compression';
import cookieParser from 'cookie-parser';   
import connectDatabase from './config/database';

// Import routes
import authRoutes from './routes/authRoutes';
import staffRoutes from './routes/staffRoutes';
import payrollRoutes from './routes/payrollRoutes';
import flagRoutes from './routes/flagRoutes';

// Create Express app
const app = express();

// ✅ CRITICAL: Required for cookies behind proxy (Render, Vercel, Nginx)
// This allows Express to trust the X-Forwarded-* headers from the proxy
app.set('trust proxy', 1);

// Connect to MongoDB
connectDatabase();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// 1. Helmet - Secure HTTP headers
app.use(helmet({
  contentSecurityPolicy: false, 
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// 2. CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5000",
  "https://payroll-transparency-frontend.vercel.app",
  // Add your Render backend URL if needed for self-requests
  process.env.BACKEND_URL, // e.g., "https://your-app.onrender.com"
].filter(Boolean); // Remove undefined values

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`❌ CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Set-Cookie"],
  })
);

// 3. Cookie Parser - MUST come BEFORE rate limiting and routes
app.use(cookieParser()); 

// 4. Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. HPP (HTTP Parameter Pollution)
app.use(hpp());

// 6. Compression
app.use(compression());

// 7. Rate Limiting (after cookie parser)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Use IP from proxy headers
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts
  skipSuccessfulRequests: true,
  message: 'Too many authentication attempts. Please try again later.',
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
});

// Apply rate limiters
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ============================================
// LOGGING
// ============================================
if (process.env.NODE_ENV === 'development') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    console.log('Cookies:', req.cookies);
    console.log('Origin:', req.get('origin'));
    next();
  });
}

// ============================================
// ROUTES
// ============================================

app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV,
    trustProxy: app.get('trust proxy')
  });
});

app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Payroll Transparency System API',
    version: '1.0.0',
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/flags', flagRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Error:', err);
  
  // Handle CORS errors specifically
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({
      success: false,
      error: 'CORS policy violation',
      message: 'Origin not allowed'
    });
    return;
  }
  
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error'
      : err.message,
  });
});

// ============================================
// SERVER STARTUP
// ============================================

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('🚀 Server running on port', PORT);
  console.log('🌍 Environment:', process.env.NODE_ENV);
  console.log('🍪 Trust proxy:', app.get('trust proxy'));
  console.log('🔒 Allowed origins:', allowedOrigins);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    // Close database connection
    import('./config/database').then(({ default: db }) => {
      // MongoDB will close via mongoose connection handler
      console.log('✅ Database connections closed');
      process.exit(0);
    });
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('❌ Unhandled Rejection:', err);
  gracefulShutdown('Unhandled Rejection');
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('Uncaught Exception');
});

export default app;