
import { Router } from 'express';
import * as staffController from '../controllers/staffController';
import { authenticate, requireAdmin, requireAdminOrAuditor } from '../middleware/auth';
import { registerStaff } from '../controllers/staffController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Admin only routes
router.post('/register',
  authenticate,              
  requireAdmin,              
  registerStaff
);
router.put('/:id', requireAdmin, staffController.updateStaff);
router.patch('/:id/status', requireAdmin, staffController.updateStaffStatus);

// Admin or Auditor routes
router.get('/stats', requireAdminOrAuditor, staffController.getStaffStats);
router.get('/', 
  authenticate,             
  requireAdminOrAuditor,     
  staffController.listStaff  
);
router.get('/:staffHash', requireAdminOrAuditor, staffController.getStaffByHash);

export default router;