
import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController';
import { 
  authenticate, 
  requireAdmin, 
  requireAuditor,
  checkPasswordChangeRequired 
} from '../middleware/auth';
import { AuthRequest, UserRole } from '../types';

const router = Router();

/**
 * DASHBOARD ROUTES
 * Role-based access to different dashboard summaries
 */

/**
 * @route   GET /api/dashboard/admin-summary
 * @desc    Get admin dashboard summary
 * @access  Private (Admin only)
 * @returns Admin-specific metrics: staff, batches, anomalies, quick actions
 */
router.get(
  '/admin-summary',
  authenticate,
  checkPasswordChangeRequired,
  requireAdmin,
  dashboardController.getAdminSummary
);

/**
 * @route   GET /api/dashboard/auditor-summary
 * @desc    Get auditor dashboard summary
 * @access  Private (Auditor only)
 * @returns Auditor-specific metrics: flags, reviews, verification status
 * @note    Changed from requireAdminOrAuditor to requireAuditor for proper separation
 */
router.get(
  '/auditor-summary',
  authenticate,
  checkPasswordChangeRequired,
  requireAuditor,
  dashboardController.getAuditorSummary
);

/**
 * @route   GET /api/dashboard/system-stats
 * @desc    Get system-wide statistics (super admin level)
 * @access  Private (Admin only)
 * @returns System health, performance metrics, database stats
 */
router.get(
  '/system-stats',
  authenticate,
  checkPasswordChangeRequired,
  requireAdmin,
  dashboardController.getSystemStats
);

/**
 * @route   GET /api/dashboard/overview
 * @desc    Get role-appropriate dashboard overview
 * @access  Private (Authenticated users)
 * @returns Dashboard data based on user's role
 * @note    This route automatically directs to appropriate dashboard
 */
router.get(
  '/overview',
  authenticate,
  checkPasswordChangeRequired,
  async (req: AuthRequest, res) => {
    try {
      // Route to appropriate dashboard based on role
      if (req.user?.role === UserRole.ADMIN) {
        return dashboardController.getAdminSummary(req, res);
      } else if (req.user?.role === UserRole.AUDITOR) {
        return dashboardController.getAuditorSummary(req, res);
      } else {
        res.status(403).json({
          success: false,
          error: 'Invalid role for dashboard access'
        });
        return;
      }
    } catch (error: any) {
      console.error('Dashboard overview error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load dashboard',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

export default router;