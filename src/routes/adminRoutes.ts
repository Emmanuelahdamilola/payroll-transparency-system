// src/routes/adminRoutes.ts
import { Router } from 'express';
import {
  authenticate,
  requireAdmin,
  checkPasswordChangeRequired
} from '../middleware/auth';

const router = Router();

/**
 * ADMIN ONLY ROUTES
 * These routes are exclusively for administrators
 * Auditors will receive 403 Forbidden if they try to access these routes
 */

/**
 * Get admin dashboard
 * GET /api/admin/dashboard
 * Auth: Required (Admin only)
 */
router.get(
  '/dashboard',
  authenticate,
  checkPasswordChangeRequired,
  requireAdmin,
  (req, res) => {
    res.json({
      success: true,
      message: 'Admin dashboard accessed',
      data: {
        message: 'Welcome to the admin dashboard',
        // Add admin-specific dashboard data here
      }
    });
  }
);

/**
 * Get system statistics
 * GET /api/admin/stats
 * Auth: Required (Admin only)
 */
router.get(
  '/stats',
  authenticate,
  checkPasswordChangeRequired,
  requireAdmin,
  (req, res) => {
    res.json({
      success: true,
      message: 'System statistics retrieved',
      data: {
        totalUsers: 0,
        activeAuditors: 0,
        // Add more statistics
      }
    });
  }
);

/**
 * Get system settings
 * GET /api/admin/settings
 * Auth: Required (Admin only)
 */
router.get(
  '/settings',
  authenticate,
  checkPasswordChangeRequired,
  requireAdmin,
  (req, res) => {
    res.json({
      success: true,
      message: 'System settings retrieved',
      data: {
        // Add system settings here
      }
    });
  }
);

/**
 * Update system settings
 * PUT /api/admin/settings
 * Auth: Required (Admin only)
 */
router.put(
  '/settings',
  authenticate,
  checkPasswordChangeRequired,
  requireAdmin,
  (req, res) => {
    res.json({
      success: true,
      message: 'System settings updated',
      data: req.body
    });
  }
);

export default router;