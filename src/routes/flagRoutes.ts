
import { Router } from 'express';
import * as flagController from '../controllers/flagController';
import { authenticate, requireAdminOrAuditor } from '../middleware/auth';

const router = Router();

// All routes require authentication and admin/auditor role
router.use(authenticate, requireAdminOrAuditor);

// Flag routes
router.get('/stats', flagController.getFlagStats);
router.get('/analyze', flagController.analyzePayrollFlags);
router.get('/', flagController.getAllFlags);
router.get('/:id', flagController.getFlagDetails);
router.patch('/:id/review', flagController.reviewFlag);

export default router;
