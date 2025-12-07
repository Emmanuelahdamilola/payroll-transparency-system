import { Request, Response } from 'express';
import Staff from '../models/Staff';
import { generateStaffHash, hashField } from '../utils/hash';
import { encrypt } from '../utils/encryption';
import { registerStaffOnChain } from '../services/blockchainService';
import { AuthRequest } from '../types';

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
      verified: false,
      isActive: true // ✅ Set default active status
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
        isActive: staff.isActive,
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
        isActive: staff.isActive,
        blockchainTxs: staff.blockchainTxs,
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt
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
 * GET /api/staff?page=1&limit=10&search=&department=&status=
 */
export const listStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const department = req.query.department as string;
    const status = req.query.status as string; // 'active' | 'inactive' | 'all'
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (department) {
      query.department = department;
    }

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (search) {
      query.staffHash = { $regex: search, $options: 'i' };
    }

    const staff = await Staff.find(query)
      .select('staffHash grade department verified isActive blockchainTxs createdAt updatedAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Staff.countDocuments(query);

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

/**
 * Update staff details (grade, department)
 * PUT /api/staff/:id
 */
export const updateStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { grade, department } = req.body;

    if (!grade && !department) {
      res.status(400).json({
        success: false,
        error: 'At least one field (grade or department) must be provided'
      });
      return;
    }

    const staff = await Staff.findById(id);

    if (!staff) {
      res.status(404).json({
        success: false,
        error: 'Staff not found'
      });
      return;
    }

    // Update fields
    if (grade) staff.grade = grade;
    if (department) staff.department = department;

    await staff.save();

    res.status(200).json({
      success: true,
      message: 'Staff updated successfully',
      data: {
        id: staff._id,
        staffHash: staff.staffHash,
        grade: staff.grade,
        department: staff.department,
        verified: staff.verified,
        isActive: staff.isActive,
        updatedAt: staff.updatedAt
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Update staff error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update staff',
      message: error.message
    });
  }
};

/**
 * Update staff status (activate/deactivate)
 * PATCH /api/staff/:id/status
 */
export const updateStaffStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'isActive must be a boolean value'
      });
      return;
    }

    const staff = await Staff.findById(id);

    if (!staff) {
      res.status(404).json({
        success: false,
        error: 'Staff not found'
      });
      return;
    }

    staff.isActive = isActive;
    await staff.save();

    res.status(200).json({
      success: true,
      message: `Staff ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: staff._id,
        staffHash: staff.staffHash,
        isActive: staff.isActive,
        updatedAt: staff.updatedAt
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Update staff status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update staff status',
      message: error.message
    });
  }
};

/**
 * Get staff statistics
 * GET /api/staff/stats
 */
export const getStaffStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalStaff = await Staff.countDocuments();
    const activeStaff = await Staff.countDocuments({ isActive: true });
    const verifiedStaff = await Staff.countDocuments({ verified: true });
    const inactiveStaff = await Staff.countDocuments({ isActive: false });

    // Get staff by department
    const byDepartment = await Staff.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          verified: {
            $sum: { $cond: ['$verified', 1, 0] }
          },
          active: {
            $sum: { $cond: ['$isActive', 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get staff by grade
    const byGrade = await Staff.aggregate([
      {
        $group: {
          _id: '$grade',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalStaff,
          activeStaff,
          inactiveStaff,
          verifiedStaff,
          unverifiedStaff: totalStaff - verifiedStaff
        },
        byDepartment,
        byGrade
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Get staff stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve staff statistics',
      message: error.message
    });
  }
};