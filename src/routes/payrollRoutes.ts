import { Router } from 'express';
import * as payrollController from '../controllers/payrollController';
import { authenticate, requireAdmin, requireAdminOrAuditor } from '../middleware/auth';
import { upload } from '../config/upload';

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
 * @route   GET /api/payroll/:id
 * @desc    Get payroll batch by ID
 * @access  Private (Admin or Auditor)
 */
router.get('/:id', authenticate, requireAdminOrAuditor, payrollController.getPayrollBatch);

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

export default router;