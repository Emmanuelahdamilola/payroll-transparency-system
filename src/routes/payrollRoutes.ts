
import { Router } from 'express';
import * as payrollController from '../controllers/payrollController';
import { authenticate, requireAdmin, requireAdminOrAuditor } from '../middleware/auth';
import { upload } from '../config/upload';
import { getPayrollFlags } from '../controllers/flagController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Admin only routes
router.post('/upload', requireAdmin, upload.single('payroll'), payrollController.uploadPayroll);

// Admin or Auditor routes
router.get('/', requireAdminOrAuditor, payrollController.listPayrollBatches);
router.get('/:id', requireAdminOrAuditor, payrollController.getPayrollBatch);
router.get('/:id/records', requireAdminOrAuditor, payrollController.getPayrollRecords);
router.get('/:id/flags', requireAdminOrAuditor, getPayrollFlags);

export default router;