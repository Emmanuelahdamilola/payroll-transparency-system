import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, requireAdmin, requireAdminOrAuditor } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/test/public
 * @desc    Public test endpoint
 * @access  Public
 */
router.get('/public', (_req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    message: 'This is a public endpoint - no authentication required',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   GET /api/test/protected
 * @desc    Protected test endpoint (any authenticated user)
 * @access  Private
 */
router.get('/protected', authenticate, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    message: 'This is a protected endpoint - authentication required',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   GET /api/test/admin-only
 * @desc    Admin-only test endpoint
 * @access  Private (Admin only)
 */
router.get('/admin-only', authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    message: 'This endpoint is only accessible by admins',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   GET /api/test/auditor-access
 * @desc    Test endpoint for admin or auditor
 * @access  Private (Admin or Auditor)
 */
router.get('/auditor-access', authenticate, requireAdminOrAuditor, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    message: 'This endpoint is accessible by admins and auditors',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

export default router;