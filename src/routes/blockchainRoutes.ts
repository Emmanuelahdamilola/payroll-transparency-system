import { Router } from 'express';
import * as blockchainController from '../controllers/blockchainController';
import { authenticate, requireAdminOrAuditor } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate, requireAdminOrAuditor);

/**
 * @route   GET /api/blockchain/recent-tx
 * @desc    Get recent blockchain transactions
 * @access  Private (Admin or Auditor)
 */
router.get('/recent-tx', blockchainController.getRecentTransactions);

/**
 * @route   GET /api/blockchain/logs
 * @desc    Get blockchain event logs
 * @access  Private (Admin or Auditor)
 */
router.get('/logs', blockchainController.getBlockchainLogs);

/**
 * @route   GET /api/blockchain/tx/:transactionHash
 * @desc    Get blockchain transaction details
 * @access  Private (Admin or Auditor)
 */
router.get('/tx/:transactionHash', blockchainController.getTransactionDetails);

/**
 * @route   GET /api/blockchain/proof/staff/:staffHash
 * @desc    Get blockchain proof for staff
 * @access  Private (Admin or Auditor)
 */
router.get('/proof/staff/:staffHash', blockchainController.getStaffBlockchainProof);

/**
 * @route   GET /api/blockchain/proof/batch/:batchId
 * @desc    Get blockchain proof for payroll batch
 * @access  Private (Admin or Auditor)
 */
router.get('/proof/batch/:batchId', blockchainController.getBatchBlockchainProof);

export default router;