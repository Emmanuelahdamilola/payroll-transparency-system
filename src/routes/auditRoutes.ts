
import { Router, Response } from 'express';
import * as auditController from '../controllers/auditController';
import { 
  authenticate, 
  requireAdmin,
  requireAuditor,
  requireAdminOrAuditor,
  checkPasswordChangeRequired 
} from '../middleware/auth';
import { AuthRequest, FlagResolution, VALIDATION_RULES } from '../types';

const router = Router();

/**
 * AUDIT ROUTES
 * Routes for audit report generation and audit statistics
 * Different access levels for different audit operations
 */

/**
 * @route   GET /api/audit/report/:batchId
 * @desc    Generate audit report for a payroll batch (PDF or JSON)
 * @access  Private (Admin or Auditor)
 * @param   batchId - The payroll batch ID
 * @query   format - 'pdf' (default) or 'json'
 * @returns Generated audit report in requested format
 * @note    Both roles can generate reports for verification
 */
router.get(
  '/report/:batchId',
  authenticate,
  checkPasswordChangeRequired,
  requireAdminOrAuditor,
  auditController.generateAuditReport
);

/**
 * @route   GET /api/audit/stats
 * @desc    Get audit statistics (overview)
 * @access  Private (Admin or Auditor)
 * @returns Audit statistics and metrics
 * @note    Both roles can view general audit stats
 */
router.get(
  '/stats',
  authenticate,
  checkPasswordChangeRequired,
  requireAdminOrAuditor,
  auditController.getAuditStats
);

/**
 * @route   GET /api/audit/reports
 * @desc    List all generated audit reports
 * @access  Private (Admin or Auditor)
 * @query   page, limit, status, dateFrom, dateTo
 * @returns Paginated list of audit reports
 */
router.get(
  '/reports',
  authenticate,
  checkPasswordChangeRequired,
  requireAdminOrAuditor,
  async (req: AuthRequest, res: Response) => {
    try {
      // Parse and validate query parameters
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(
        VALIDATION_RULES.PAGINATION_MAX_LIMIT,
        Math.max(1, parseInt(req.query.limit as string) || VALIDATION_RULES.PAGINATION_DEFAULT_LIMIT)
      );
      const status = req.query.status as string;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;

      // Validate dates if provided
      if (dateFrom && isNaN(Date.parse(dateFrom))) {
        res.status(400).json({
          success: false,
          error: 'Invalid dateFrom format. Use ISO 8601 format.'
        });
        return;
      }

      if (dateTo && isNaN(Date.parse(dateTo))) {
        res.status(400).json({
          success: false,
          error: 'Invalid dateTo format. Use ISO 8601 format.'
        });
        return;
      }

      // Placeholder for list audit reports controller
      res.status(200).json({
        success: true,
        message: 'Audit reports list',
        data: {
          reports: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 0,
            hasMore: false
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('List audit reports error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve audit reports',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   GET /api/audit/history/:staffHash
 * @desc    Get audit history for specific staff member
 * @access  Private (Auditor only)
 * @param   staffHash - The staff hash identifier
 * @returns Complete audit history for the staff member
 * @note    Auditor-only route for detailed staff audit history
 */
router.get(
  '/history/:staffHash',
  authenticate,
  checkPasswordChangeRequired,
  requireAuditor,
  async (req: AuthRequest, res: Response) => {
    try {
      const { staffHash } = req.params;

      // Validate staffHash format (basic validation)
      if (!staffHash || staffHash.length < 10) {
        res.status(400).json({
          success: false,
          error: 'Invalid staffHash format'
        });
        return;
      }
      
      // Placeholder for staff audit history
      res.status(200).json({
        success: true,
        message: 'Staff audit history retrieved',
        data: {
          staffHash,
          history: []
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Get staff audit history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve staff audit history',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   POST /api/audit/review/:flagId
 * @desc    Review and resolve an audit flag
 * @access  Private (Auditor only)
 * @param   flagId - The flag ID to review
 * @body    { resolution: 'confirmed' | 'false_positive', notes: string }
 * @returns Updated flag with review status
 * @note    Only auditors can review and resolve flags
 */
router.post(
  '/review/:flagId',
  authenticate,
  checkPasswordChangeRequired,
  requireAuditor,
  async (req: AuthRequest, res: Response) => {
    try {
      const { flagId } = req.params;
      const { resolution, notes } = req.body;

      // Validate flagId format (MongoDB ObjectId)
      if (!flagId || !/^[0-9a-fA-F]{24}$/.test(flagId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid flag ID format'
        });
        return;
      }
      
      // Validate resolution
      const validResolutions = [FlagResolution.CONFIRMED, FlagResolution.FALSE_POSITIVE];
      if (!resolution || !validResolutions.includes(resolution)) {
        res.status(400).json({
          success: false,
          error: `Invalid resolution. Must be one of: ${validResolutions.join(', ')}`
        });
        return;
      }

      // Validate notes if provided
      if (notes && typeof notes !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Notes must be a string'
        });
        return;
      }

      if (notes && notes.length > 1000) {
        res.status(400).json({
          success: false,
          error: 'Notes must not exceed 1000 characters'
        });
        return;
      }
      
      // Placeholder for flag review logic
      res.status(200).json({
        success: true,
        message: 'Flag reviewed successfully',
        data: {
          flagId,
          resolution,
          notes: notes?.trim() || '',
          reviewedBy: req.user?.id,
          reviewedAt: new Date()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Review flag error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to review flag',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   GET /api/audit/pending-reviews
 * @desc    Get all pending audit reviews
 * @access  Private (Auditor only)
 * @query   page, limit, priority
 * @returns List of flags pending review
 * @note    Auditor-only route to see their review queue
 */
router.get(
  '/pending-reviews',
  authenticate,
  checkPasswordChangeRequired,
  requireAuditor,
  async (req: AuthRequest, res: Response) => {
    try {
      // Parse and validate query parameters
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(
        VALIDATION_RULES.PAGINATION_MAX_LIMIT,
        Math.max(1, parseInt(req.query.limit as string) || VALIDATION_RULES.PAGINATION_DEFAULT_LIMIT)
      );
      const priority = req.query.priority as string;

      // Validate priority if provided
      const validPriorities = ['low', 'medium', 'high'];
      if (priority && !validPriorities.includes(priority.toLowerCase())) {
        res.status(400).json({
          success: false,
          error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`
        });
        return;
      }

      // Placeholder for pending reviews
      res.status(200).json({
        success: true,
        message: 'Pending reviews retrieved',
        data: {
          pendingReviews: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 0,
            hasMore: false
          },
          count: 0
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Get pending reviews error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve pending reviews',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

export default router;