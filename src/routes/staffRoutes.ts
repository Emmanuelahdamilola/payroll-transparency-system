import { Router } from 'express';
import * as staffController from '../controllers/staffController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/staff/register
 * @desc    Register a new staff member
 * @access  Private (Admin only)
 */
router.post('/register', authenticate, requireAdmin, staffController.registerStaff);

/**
 * @route   GET /api/staff/:staffHash
 * @desc    Get staff by staffHash
 * @access  Private (Admin or Auditor)
 */
router.get('/:staffHash', authenticate, staffController.getStaffByHash);

/**
 * @route   GET /api/staff
 * @desc    List all staff (paginated)
 * @access  Private (Admin only)
 */
router.get('/', authenticate, requireAdmin, staffController.listStaff);

export default router;