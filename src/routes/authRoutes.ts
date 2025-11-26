import { Router } from 'express';
import * as authController from '../controllers/authController';
import * as authMiddleware from '../middleware/auth';

const router = Router();

// Debug middleware to log all requests to auth routes
router.use((req, res, next) => {
  console.log(`[AUTH ROUTE] ${req.method} ${req.path}`);
  next();
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authMiddleware.authenticate, authController.getProfile);

export default router;