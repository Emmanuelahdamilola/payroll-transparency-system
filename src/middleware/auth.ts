import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../types';
import { verifyToken, extractToken } from '../utils/auth';

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const token = extractToken(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'No token provided. Please authenticate.'
      });
      return;
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Attach user info to request
    req.user = {
      id: decoded.id,
      role: decoded.role
    };
    
    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      message: error.message
    });
  }
};

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