
import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.put('/update-profile', authenticate, authController.updateProfile);

// Admin only routes
router.post('/create-auditor', authenticate, requireAdmin, authController.createAuditor);
router.get('/users', authenticate, requireAdmin, authController.listUsers);
router.patch('/users/:id/status', authenticate, requireAdmin, authController.toggleUserStatus);

export default router;