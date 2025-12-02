import { Router } from 'express';
import * as flagController from '../controllers/flagController';
import { authenticate, requireAdminOrAuditor } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/flags/stats
 * @desc    Get flag statistics
 * @access  Private (Admin or Auditor)
 */
router.get('/stats', authenticate, requireAdminOrAuditor, flagController.getFlagStats);

/**
 * @route   GET /api/flags/analyze
 * @desc    Get AI-powered flag analysis
 * @access  Private (Admin or Auditor)
 */
router.get('/analyze', authenticate, requireAdminOrAuditor, flagController.analyzePayrollFlags);

/**
 * @route   GET /api/flags
 * @desc    Get all flags (with filters)
 * @access  Private (Admin or Auditor)
 */
router.get('/', authenticate, requireAdminOrAuditor, flagController.getAllFlags);

/**
 * @route   GET /api/flags/:id
 * @desc    Get specific flag details
 * @access  Private (Admin or Auditor)
 */
router.get('/:id', authenticate, requireAdminOrAuditor, flagController.getFlagDetails);

/**
 * @route   PATCH /api/flags/:id/review
 * @desc    Review/resolve a flag
 * @access  Private (Admin or Auditor)
 */
router.patch('/:id/review', authenticate, requireAdminOrAuditor, flagController.reviewFlag);

export default router;