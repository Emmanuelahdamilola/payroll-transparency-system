import jwt from 'jsonwebtoken';
import config from '../config/env';
import { UserRole } from '../types';

interface TokenPayload {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Generate JWT token for authenticated user
 */
export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: '1d' // Token expires in 1 day
  });
};

/**
 * Verify and decode JWT token
 */
export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Extract token from Authorization header
 */
export const extractToken = (authHeader?: string): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
};