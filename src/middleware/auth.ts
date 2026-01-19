import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../types';
import { verifyToken } from '../utils/auth';
import User from '../models/User';

/**
 * Middleware to verify JWT token from cookie and attach user to request
 * Validates token, checks user existence, and ensures account is active
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Debug logging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Auth Middleware Debug:');
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

    // Verify user still exists and is active
    const user = await User.findById(decoded.id).select('+mustChangePassword');
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User account no longer exists'
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        error: 'Account is deactivated. Contact administrator.'
      });
      return;
    }
    
    // Attach user info to request
    req.user = {
      id: decoded.id,
      role: decoded.role as UserRole
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.log('  ✓ User authenticated:', decoded.id, '-', decoded.role);
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
 * Usage: authorize(UserRole.ADMIN) or authorize(UserRole.ADMIN, UserRole.AUDITOR)
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
        message: `Access denied. This action requires ${roles.length > 1 ? 'one of the following roles' : 'role'}: ${roles.join(', ')}`
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user must change password
 * Redirects to password change flow if mustChangePassword flag is set
 * Should be applied AFTER authenticate middleware
 */
export const checkPasswordChangeRequired = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // SuperAdmins bypass password change requirement
    if (req.user.role === UserRole.SUPERADMIN) {
      next();
      return;
    }

    // Skip check for password change endpoints and profile view
    const allowedPaths = [
      '/api/auth/force-change-password',
      '/api/auth/update-profile',
      '/api/auth/logout',
      '/api/auth/profile'
    ];

    // Check if current path is in allowed paths
    const isAllowedPath = allowedPaths.some(path => req.path.endsWith(path));
    
    if (isAllowedPath) {
      next();
      return;
    }

    // Check if user must change password
    const user = await User.findById(req.user.id).select('+mustChangePassword');
    
    if (user && user.mustChangePassword) {
      res.status(403).json({
        success: false,
        error: 'Password change required',
        message: 'You must change your password before accessing this resource',
        mustChangePassword: true
      });
      return;
    }

    next();
  } catch (error: any) {
    console.error('❌ Password change check error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 🆕 Middleware to check if user is SuperAdmin
 * Shorthand for authorize(UserRole.SUPERADMIN)
 */
export const requireSuperAdmin = authorize(UserRole.SUPERADMIN);

/**
 * Middleware to check if user is admin
 * Shorthand for authorize(UserRole.ADMIN)
 */
export const requireAdmin = authorize(UserRole.ADMIN);

/**
 * Middleware to check if user is auditor
 * Shorthand for authorize(UserRole.AUDITOR)
 */
export const requireAuditor = authorize(UserRole.AUDITOR);

/**
 * Middleware to check if user is admin or auditor
 * Allows both roles to access the endpoint
 */
export const requireAdminOrAuditor = authorize(UserRole.ADMIN, UserRole.AUDITOR);

/**
 * 🆕 Middleware to check if user is SuperAdmin or Admin
 * Allows both SuperAdmin and Admin to access
 */
export const requireSuperAdminOrAdmin = authorize(UserRole.SUPERADMIN, UserRole.ADMIN);

/**
 * Middleware to restrict access to admin routes from auditors
 * Use this on admin-only routes for explicit denial
 */
export const denyAuditor = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role === UserRole.AUDITOR) {
    res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Auditors do not have permission to access this resource'
    });
    return;
  }
  next();
};

/**
 * Middleware to restrict access to auditor routes from admins
 * Use this on auditor-only routes if needed for explicit denial
 */
export const denyAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role === UserRole.ADMIN) {
    res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Admins do not have permission to access this resource'
    });
    return;
  }
  next();
};

/**
 * Optional middleware for rate limiting per user
 * Can be used to prevent abuse on sensitive endpoints
 */
export const userRateLimit = (maxRequests: number, windowMs: number) => {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();

  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required for rate limiting'
      });
      return;
    }

    const userId = req.user.id;
    const now = Date.now();
    const userRecord = requestCounts.get(userId);

    if (!userRecord || now > userRecord.resetTime) {
      // Create new record or reset expired one
      requestCounts.set(userId, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
      return;
    }

    if (userRecord.count >= maxRequests) {
      const retryAfter = Math.ceil((userRecord.resetTime - now) / 1000);
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${retryAfter} seconds.`,
        retryAfter
      });
      return;
    }

    userRecord.count++;
    next();
  };
};