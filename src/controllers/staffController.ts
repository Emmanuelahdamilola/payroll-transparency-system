import { Request, Response } from 'express';
import Staff from '../models/Staff';
import { generateStaffHash, hashField } from '../utils/hash';
import { encrypt } from '../utils/encryption';
import { registerStaffOnChain } from '../services/blockchainService';

/**
 * Register a new staff member
 * POST /api/staff/register
 */
export const registerStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, dob, bvn, nin, phone, grade, department } = req.body;

    // Validate required fields
    if (!name || !dob || !bvn || !nin || !phone || !grade || !department) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['name', 'dob', 'bvn', 'nin', 'phone', 'grade', 'department']
      });
      return;
    }

    // Validate date format (YYYY-MM-DD)
    const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dobRegex.test(dob)) {
      res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD (e.g., 1990-05-15)'
      });
      return;
    }

    // Validate BVN (11 digits)
    if (!/^\d{11}$/.test(bvn)) {
      res.status(400).json({
        success: false,
        error: 'BVN must be exactly 11 digits'
      });
      return;
    }

    // Validate NIN (11 digits)
    if (!/^\d{11}$/.test(nin)) {
      res.status(400).json({
        success: false,
        error: 'NIN must be exactly 11 digits'
      });
      return;
    }

    // Generate deterministic staff hash
    const staffHash = generateStaffHash(name, dob, bvn, nin);

    // Check if staff already exists
    const existingStaff = await Staff.findOne({ staffHash });
    if (existingStaff) {
      res.status(400).json({
        success: false,
        error: 'Staff member already registered',
        staffHash
      });
      return;
    }

    // Check for duplicate BVN
    const bvnHash = hashField(bvn);
    const duplicateBVN = await Staff.findOne({ bvnHash });
    if (duplicateBVN) {
      res.status(400).json({
        success: false,
        error: 'BVN already registered to another staff member'
      });
      return;
    }

    // Check for duplicate NIN
    const ninHash = hashField(nin);
    const duplicateNIN = await Staff.findOne({ ninHash });
    if (duplicateNIN) {
      res.status(400).json({
        success: false,
        error: 'NIN already registered to another staff member'
      });
      return;
    }

    // Encrypt sensitive PII
    const nameEncrypted = encrypt(name);
    const dobEncrypted = encrypt(dob);
    const phoneHash = hashField(phone);

    // Create staff document
    const staff = await Staff.create({
      nameEncrypted,
      dobEncrypted,
      bvnHash,
      ninHash,
      phoneHash,
      staffHash,
      grade,
      department,
      blockchainTxs: [],
      verified: false
    });

    // Register on blockchain
    try {
      const blockchainTx = await registerStaffOnChain(staffHash);
      
      // Update staff document with blockchain tx
      staff.blockchainTxs.push(blockchainTx.transactionHash);
      staff.verified = true;
      await staff.save();
      
      console.log(`✅ Staff registered on blockchain: ${blockchainTx.transactionHash}`);
    } catch (blockchainError: any) {
      console.error('Blockchain registration failed:', blockchainError);
      // Staff is still saved in DB, but not verified on blockchain
    }

    // Return success (DO NOT return raw PII)
    res.status(201).json({
      success: true,
      message: staff.verified 
        ? 'Staff registered successfully on blockchain' 
        : 'Staff registered off-chain (blockchain registration failed)',
      data: {
        id: staff._id,
        staffHash,
        grade,
        department,
        verified: staff.verified,
        blockchainTxs: staff.blockchainTxs,
        createdAt: staff.createdAt
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Staff registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Staff registration failed',
      message: error.message
    });
  }
};

/**
 * Get staff by staffHash
 * GET /api/staff/:staffHash
 */
export const getStaffByHash = async (req: Request, res: Response): Promise<void> => {
  try {
    const { staffHash } = req.params;

    const staff = await Staff.findOne({ staffHash });

    if (!staff) {
      res.status(404).json({
        success: false,
        error: 'Staff not found'
      });
      return;
    }

    // Return only non-sensitive information
    res.status(200).json({
      success: true,
      data: {
        id: staff._id,
        staffHash: staff.staffHash,
        grade: staff.grade,
        department: staff.department,
        verified: staff.verified,
        blockchainTxs: staff.blockchainTxs,
        createdAt: staff.createdAt
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Get staff error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve staff',
      message: error.message
    });
  }
};

/**
 * List all staff (paginated, admin only)
 * GET /api/staff?page=1&limit=10
 */
export const listStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const staff = await Staff.find()
      .select('staffHash grade department verified blockchainTxs createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Staff.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        staff,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('List staff error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list staff',
      message: error.message
    });
  }
};