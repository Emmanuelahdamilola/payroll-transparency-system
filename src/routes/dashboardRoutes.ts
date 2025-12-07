import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController';
import { authenticate, requireAdmin, requireAdminOrAuditor } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/dashboard/admin-summary
 * @desc    Get admin dashboard summary
 * @access  Private (Admin only)
 */
router.get('/admin-summary', requireAdmin, dashboardController.getAdminSummary);

/**
 * @route   GET /api/dashboard/auditor-summary
 * @desc    Get auditor dashboard summary
 * @access  Private (Admin or Auditor)
 */
router.get('/auditor-summary', requireAdminOrAuditor, dashboardController.getAuditorSummary);

/**
 * @route   GET /api/dashboard/system-stats
 * @desc    Get system-wide statistics
 * @access  Private (Admin only)
 */
router.get('/system-stats', requireAdmin, dashboardController.getSystemStats);

export default router;

