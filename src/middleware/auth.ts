import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../types';
import { verifyToken } from '../utils/auth';

/**
 * Middleware to verify JWT token from cookie and attach user to request
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Debug logging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 Auth Middleware Debug:');
      console.log('  - Cookies:', req.cookies);
      console.log('  - Token from cookie:', req.cookies?.token ? 'EXISTS' : 'MISSING');
      console.log('  - Auth header:', req.headers.authorization ? 'EXISTS' : 'MISSING');
    }

    // Extract token from cookie (primary) or Authorization header (fallback)
    const token = req.cookies?.token || extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'No token provided. Please authenticate.'
      });
      return;
    }

    // Verify token
    const decoded = verifyToken(token);
    
    if (!decoded || !decoded.id || !decoded.role) {
      res.status(401).json({
        success: false,
        error: 'Invalid token payload'
      });
      return;
    }
    
    // Attach user info to request
    req.user = {
      id: decoded.id,
      role: decoded.role
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.log('  - User authenticated:', decoded.id, '-', decoded.role);
    }
    
    next();
  } catch (error: any) {
    console.error('❌ Authentication error:', error.message);
    
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Helper to extract token from Authorization header
 */
function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Middleware to check if user has required role(s)
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`⚠️  Authorization failed: User role '${req.user.role}' not in allowed roles: ${roles.join(', ')}`);
      }
      
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `This action requires one of the following roles: ${roles.join(', ')}`
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = authorize(UserRole.ADMIN);

/**
 * Middleware to check if user is admin or auditor
 */
export const requireAdminOrAuditor = authorize(UserRole.ADMIN, UserRole.AUDITOR);