import { Router } from 'express';
import * as superAdminController from '../controllers/superAdminController';
import { authenticate, requireSuperAdmin } from '../middleware/auth';

const router = Router();

// All routes require SuperAdmin authentication
router.use(authenticate, requireSuperAdmin);

// ============================================
// ACTIVITY LOGS
// ============================================

/**
 * Get all activity logs with optional filters
 * GET /api/super-admin/logs/activity
 * Query params: page, limit, userId, role, action, entityType, status, startDate, endDate
 */
router.get('/logs/activity', superAdminController.getActivityLogs);

/**
 * Get authentication logs (login/logout)
 * GET /api/super-admin/logs/authentication
 * Query params: page, limit
 */
router.get('/logs/authentication', superAdminController.getAuthenticationLogs);

/**
 * Get security-related logs
 * GET /api/super-admin/logs/security
 * Query params: page, limit
 */
router.get('/logs/security', superAdminController.getSecurityLogs);

/**
 * Get payroll activity logs
 * GET /api/super-admin/logs/payroll
 * Query params: page, limit
 */
router.get('/logs/payroll', superAdminController.getPayrollActivityLogs);

/**
 * Get activity history for specific user
 * GET /api/super-admin/logs/user/:userId/history
 * Params: userId
 * Query params: page, limit
 */
router.get('/logs/user/:userId/history', superAdminController.getUserActivityHistory);

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * Create new admin or auditor
 * POST /api/super-admin/users/create
 * Body: { email, password, firstName, lastName, role }
 */
router.post('/users/create', superAdminController.createUser);

// ============================================
// REPORTING
// ============================================

/**
 * Generate comprehensive system report
 * GET /api/super-admin/reports/system
 * Query params: startDate?, endDate?
 */
router.get('/reports/system', superAdminController.generateSystemReport);

// ============================================
// BLOCKCHAIN MONITORING
// ============================================

/**
 * Get blockchain transaction statistics
 * GET /api/super-admin/blockchain/stats
 */
router.get('/blockchain/stats', superAdminController.getBlockchainStats);

export default router;