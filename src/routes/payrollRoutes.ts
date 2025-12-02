import { Router } from 'express';
import * as payrollController from '../controllers/payrollController';
import { authenticate, requireAdmin, requireAdminOrAuditor } from '../middleware/auth';
import { upload } from '../config/upload';
import { getPayrollFlags } from '../controllers/flagController';

const router = Router();

/**
 * @route   POST /api/payroll/upload
 * @desc    Upload payroll CSV file
 * @access  Private (Admin only)
 */
router.post(
  '/upload',
  authenticate,
  requireAdmin,
  upload.single('payroll'),
  payrollController.uploadPayroll
);

/**
 * @route   GET /api/payroll
 * @desc    List all payroll batches (paginated)
 * @access  Private (Admin or Auditor)
 */
router.get('/', authenticate, requireAdminOrAuditor, payrollController.listPayrollBatches);

/**
 * @route   GET /api/payroll/:id/records
 * @desc    Get payroll records for a batch
 * @access  Private (Admin or Auditor)
 */
router.get('/:id/records', authenticate, requireAdminOrAuditor, payrollController.getPayrollRecords);

/**
 * @route   GET /api/payroll/:id/flags
 * @desc    Get all flags for a specific payroll batch
 * @access  Private (Admin or Auditor)
 */
router.get('/:id/flags', authenticate, requireAdminOrAuditor, (req, res, next) => {
  getPayrollFlags(req, res);
});

/**
 * @route   GET /api/payroll/:id
 * @desc    Get payroll batch by ID
 * @access  Private (Admin or Auditor)
 */
router.get('/:id', authenticate, requireAdminOrAuditor, payrollController.getPayrollBatch);

export default router;