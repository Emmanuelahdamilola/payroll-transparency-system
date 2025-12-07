import { Router } from 'express';
import * as auditController from '../controllers/auditController';
import { authenticate, requireAdminOrAuditor } from '../middleware/auth';

const router = Router();

// All routes require authentication and admin/auditor role
router.use(authenticate, requireAdminOrAuditor);

/**
 * @route   GET /api/audit/report/:batchId
 * @desc    Generate audit report for a payroll batch (PDF or JSON)
 * @query   format - 'pdf' (default) or 'json'
 * @access  Private (Admin or Auditor)
 */
router.get('/report/:batchId', auditController.generateAuditReport);

/**
 * @route   GET /api/audit/stats
 * @desc    Get audit statistics
 * @access  Private (Admin or Auditor)
 */
router.get('/stats', auditController.getAuditStats);

export default router;