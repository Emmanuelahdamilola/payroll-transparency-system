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

// Required for cookies behind proxy (Render, Vercel, Nginx)
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

// 2. CORS configuration - FIXED for same-domain deployment
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5000'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like Postman, mobile apps, same-origin)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // In production on Render, if frontend is served from same domain, allow it
    if (process.env.NODE_ENV === 'production' && !origin) {
      return callback(null, true);
    }
    
    const msg = 'The CORS policy does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true, // ✅ Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'], 
  exposedHeaders: ['Set-Cookie'], // ✅ Expose Set-Cookie header
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// 3. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Increased from 5 to 10 for development
  skipSuccessfulRequests: true,
  message: 'Too many authentication attempts. Please try again later.',
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// 4. Cookie Parser - MUST come before routes
app.use(cookieParser()); 

// 5. Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 6. HPP
app.use(hpp());

// 7. Compression
app.use(compression());

// ============================================
// LOGGING
// ============================================
if (process.env.NODE_ENV === 'development') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    console.log('Cookies:', req.cookies); // Log cookies for debugging
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
    environment: process.env.NODE_ENV
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

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
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