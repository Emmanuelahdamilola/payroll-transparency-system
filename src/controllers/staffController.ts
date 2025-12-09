
import { Request, Response } from 'express';
import Staff from '../models/Staff';
import { generateStaffHash, hashField } from '../utils/hash';
import { encrypt, decrypt } from '../utils/encryption';
import { registerStaffOnChain } from '../services/blockchainService';
import { AuthRequest } from '../types';
import { UserRole } from '../types';

/**
 * Helper function to decrypt staff data
 * ONLY for authenticated admins
 */
const decryptStaffData = (staff: any, userRole: string) => {
  // ✅ ONLY decrypt for admins
  if (userRole !== UserRole.ADMIN) {
    return {
      name: '[REDACTED]', // Auditors see redacted
      email: '[REDACTED]',
      dob: null,
      bankAccount: null,
      bankName: null,
    };
  }

  // Decrypt for admins
  try {
    return {
      name: staff.nameEncrypted ? decrypt(staff.nameEncrypted) : null,
      dob: staff.dobEncrypted ? decrypt(staff.dobEncrypted) : null,
      email: staff.emailEncrypted ? decrypt(staff.emailEncrypted) : null,
      bankAccount: staff.bankAccountEncrypted ? decrypt(staff.bankAccountEncrypted) : null,
      bankName: staff.bankNameEncrypted ? decrypt(staff.bankNameEncrypted) : null,
    };
  } catch (error) {
    console.error('Decryption error:', error);
    return {
      name: '[Decryption Error]',
      dob: null,
      email: null,
      bankAccount: null,
      bankName: null,
    };
  }
};

/**
 * Generate unique staff ID
 * Format: EKT/YYYY/NNNN (e.g., EKT/2024/0001)
 */
const generateStaffId = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = 'EKT';
  
  const startOfYear = new Date(year, 0, 1);
  const count = await Staff.countDocuments({
    createdAt: { $gte: startOfYear }
  });
  
  const sequence = (count + 1).toString().padStart(4, '0');
  return `${prefix}/${year}/${sequence}`;
};

/**
 * Register a new staff member
 * POST /api/staff/register
 * Access: Admin only
 */
// export const registerStaff = async (req: AuthRequest, res: Response): Promise<void> => {
//   try {
//     const { 
//       name, 
//       dob, 
//       bvn, 
//       nin, 
//       phone, 
//       email,
//       grade, 
//       department,
//       position,
//       employmentType,
//       hireDate,
//       bankAccount,
//       bankName
//     } = req.body;

//     // Validate required fields
//     if (!name || !dob || !bvn || !nin || !phone || !grade || !department) {
//       res.status(400).json({
//         success: false,
//         error: 'Missing required fields',
//         required: ['name', 'dob', 'bvn', 'nin', 'phone', 'grade', 'department']
//       });
//       return;
//     }

//     // Validate email if provided
//     if (email && !/^\S+@\S+\.\S+$/.test(email)) {
//       res.status(400).json({
//         success: false,
//         error: 'Invalid email format'
//       });
//       return;
//     }

//     // Validate date format (YYYY-MM-DD)
//     const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
//     if (!dobRegex.test(dob)) {
//       res.status(400).json({
//         success: false,
//         error: 'Invalid date format. Use YYYY-MM-DD (e.g., 1990-05-15)'
//       });
//       return;
//     }

//     // Validate BVN (11 digits)
//     if (!/^\d{11}$/.test(bvn)) {
//       res.status(400).json({
//         success: false,
//         error: 'BVN must be exactly 11 digits'
//       });
//       return;
//     }

//     // Validate NIN (11 digits)
//     if (!/^\d{11}$/.test(nin)) {
//       res.status(400).json({
//         success: false,
//         error: 'NIN must be exactly 11 digits'
//       });
//       return;
//     }

//     // Generate deterministic staff hash
//     const staffHash = generateStaffHash(name, dob, bvn, nin);

//     // Check if staff already exists
//     const existingStaff = await Staff.findOne({ staffHash });
//     if (existingStaff) {
//       res.status(400).json({
//         success: false,
//         error: 'Staff member already registered',
//         staffHash
//       });
//       return;
//     }

//     // Check for duplicate BVN
//     const bvnHash = hashField(bvn);
//     const duplicateBVN = await Staff.findOne({ bvnHash });
//     if (duplicateBVN) {
//       res.status(400).json({
//         success: false,
//         error: 'BVN already registered to another staff member'
//       });
//       return;
//     }

//     // Check for duplicate NIN
//     const ninHash = hashField(nin);
//     const duplicateNIN = await Staff.findOne({ ninHash });
//     if (duplicateNIN) {
//       res.status(400).json({
//         success: false,
//         error: 'NIN already registered to another staff member'
//       });
//       return;
//     }

//     // Generate unique staff ID
//     const staffId = await generateStaffId();

//     // Encrypt sensitive PII
//     const nameEncrypted = encrypt(name);
//     const dobEncrypted = encrypt(dob);
//     const phoneHash = hashField(phone);
//     const emailEncrypted = email ? encrypt(email) : undefined;
//     const bankAccountEncrypted = bankAccount ? encrypt(bankAccount) : undefined;
//     const bankNameEncrypted = bankName ? encrypt(bankName) : undefined;

//     // Create staff document
//     const staff = await Staff.create({
//       nameEncrypted,
//       dobEncrypted,
//       emailEncrypted,
//       bvnHash,
//       ninHash,
//       phoneHash,
//       staffHash,
//       staffId,
//       grade,
//       department,
//       position,
//       employmentType: employmentType || 'permanent',
//       hireDate: hireDate ? new Date(hireDate) : undefined,
//       bankAccountEncrypted,
//       bankNameEncrypted,
//       blockchainTxs: [],
//       verified: false,
//       isActive: true,
//       createdBy: req.user?.id
//     });

//     // Register on blockchain
//     try {
//       const blockchainTx = await registerStaffOnChain(staffHash);
      
//       staff.blockchainTxs.push(blockchainTx.transactionHash);
//       staff.verified = true;
//       await staff.save();
      
//       console.log(`✅ Staff registered on blockchain: ${blockchainTx.transactionHash}`);
//     } catch (blockchainError: any) {
//       console.error('⚠️ Blockchain registration failed:', blockchainError.message);
//     }

//     // ✅ Return decrypted data ONLY because this is admin-only endpoint
//     res.status(201).json({
//       success: true,
//       message: staff.verified 
//         ? 'Staff registered successfully on blockchain' 
//         : 'Staff registered off-chain (blockchain registration failed)',
//       data: {
//         id: staff._id,
//         staffId: staff.staffId,
//         staffHash,
//         name, // Original name (admin can see)
//         email: email || null,
//         grade,
//         department,
//         position: staff.position,
//         employmentType: staff.employmentType,
//         verified: staff.verified,
//         isActive: staff.isActive,
//         blockchainTxs: staff.blockchainTxs,
//         createdAt: staff.createdAt
//       },
//       timestamp: new Date().toISOString()
//     });
//   } catch (error: any) {
//     console.error('Staff registration error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Staff registration failed',
//       message: error.message
//     });
//   }
// };

/**
 * Register a new staff member
 * POST /api/staff/register
 * Access: Admin only
 */
export const registerStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { 
      name, 
      dob, 
      bvn, 
      nin, 
      phone, 
      email,
      staffId: customStaffId, 
      grade, 
      department,
      position,
      employmentType,
      hireDate,
      bankAccount,
      bankName
    } = req.body;

    // Validate required fields
    if (!name || !dob || !bvn || !nin || !phone || !grade || !department) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['name', 'dob', 'bvn', 'nin', 'phone', 'grade', 'department']
      });
      return;
    }

    // Validate email if provided
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format'
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

    // Use custom staffId if provided, otherwise generate one
    const finalStaffId = customStaffId || await generateStaffId();

    // Check if staffId already exists
    if (finalStaffId) {
      const existingStaffId = await Staff.findOne({ staffId: finalStaffId });
      if (existingStaffId) {
        res.status(400).json({
          success: false,
          error: 'Staff ID already exists',
          staffId: finalStaffId
        });
        return;
      }
    }

    // Encrypt sensitive PII
    const nameEncrypted = encrypt(name);
    const dobEncrypted = encrypt(dob);
    const phoneHash = hashField(phone);
    const emailEncrypted = email ? encrypt(email) : undefined;
    const bankAccountEncrypted = bankAccount ? encrypt(bankAccount) : undefined;
    const bankNameEncrypted = bankName ? encrypt(bankName) : undefined;

    // Create staff document
    const staff = await Staff.create({
      nameEncrypted,
      dobEncrypted,
      emailEncrypted,
      bvnHash,
      ninHash,
      phoneHash,
      staffHash,
      staffId: finalStaffId,
      grade,
      department,
      position,
      employmentType: employmentType || 'permanent',
      hireDate: hireDate ? new Date(hireDate) : undefined,
      bankAccountEncrypted,
      bankNameEncrypted,
      blockchainTxs: [],
      verified: false,
      isActive: true,
      createdBy: req.user?.id
    });

    // Register on blockchain
    try {
      const blockchainTx = await registerStaffOnChain(staffHash);
      
      staff.blockchainTxs.push(blockchainTx.transactionHash);
      staff.verified = true;
      await staff.save();
      
      console.log(`Staff registered on blockchain: ${blockchainTx.transactionHash}`);
    } catch (blockchainError: any) {
      console.error('Blockchain registration failed:', blockchainError.message);
    }

    // Return complete data (including decrypted fields for admin)
    res.status(201).json({
      success: true,
      message: staff.verified 
        ? 'Staff registered successfully on blockchain' 
        : 'Staff registered off-chain (blockchain registration failed)',
      data: {
        id: staff._id,
        staffId: staff.staffId,
        staffHash,
        name, 
        email: email || null, 
        dob,
        grade,
        department,
        position: staff.position || null, 
        employmentType: staff.employmentType, 
        hireDate: staff.hireDate || null, 
        bankAccount: bankAccount || null, 
        bankName: bankName || null, 
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
 * List all staff
 * GET /api/staff
 * Access: Admin (sees names) | Auditor (sees hashes only)
 */
export const listStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const department = req.query.department as string;
    const status = req.query.status as string;
    const skip = (page - 1) * limit;

    const userRole = req.user!.role; // Get user role

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
      query.$or = [
        { staffHash: { $regex: search, $options: 'i' } },
        { staffId: { $regex: search, $options: 'i' } }
      ];
    }

    // Select fields based on role
    const selectFields = userRole === UserRole.ADMIN
      ? 'nameEncrypted emailEncrypted staffHash staffId grade department position employmentType verified isActive blockchainTxs createdAt updatedAt'
      : 'staffHash staffId grade department position employmentType verified isActive blockchainTxs createdAt updatedAt'; // No encrypted fields for auditors

    const staffList = await Staff.find(query)
      .select(selectFields)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Staff.countDocuments(query);

    // Format response based on role
    const staffWithData = staffList.map(staff => {
      const baseData = {
        id: staff._id,
        staffId: staff.staffId,
        staffHash: staff.staffHash,
        grade: staff.grade,
        department: staff.department,
        position: staff.position,
        employmentType: staff.employmentType,
        verified: staff.verified,
        isActive: staff.isActive,
        blockchainTxs: staff.blockchainTxs,
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt
      };

      // ONLY decrypt for admins
      if (userRole === UserRole.ADMIN) {
        const decrypted = decryptStaffData(staff, userRole);
        return {
          ...baseData,
          name: decrypted.name,
          email: decrypted.email, 
        };
      }

      //  Auditors see redacted
      return {
        ...baseData,
        name: '[REDACTED - Admin Only]',
        email: '[REDACTED - Admin Only]',
      };
    });

    res.status(200).json({
      success: true,
      data: {
        staff: staffWithData,
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
 * Get staff by staffHash
 * GET /api/staff/:staffHash
 * Access: Admin (sees full data) | Auditor (sees limited data)
 */
export const getStaffByHash = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { staffHash } = req.params;
    const userRole = req.user!.role;

    const staff = await Staff.findOne({ staffHash });

    if (!staff) {
      res.status(404).json({
        success: false,
        error: 'Staff not found'
      });
      return;
    }

    // Base data (available to all)
    const baseData = {
      id: staff._id,
      staffId: staff.staffId,
      staffHash: staff.staffHash,
      grade: staff.grade,
      department: staff.department,
      position: staff.position,
      employmentType: staff.employmentType,
      hireDate: staff.hireDate,
      verified: staff.verified,
      isActive: staff.isActive,
      blockchainTxs: staff.blockchainTxs,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt
    };

    // Decrypt for admins only
    if (userRole === UserRole.ADMIN) {
      const decrypted = decryptStaffData(staff, userRole);
      res.status(200).json({
        success: true,
        data: {
          ...baseData,
          name: decrypted.name,
          email: decrypted.email,
          dob: decrypted.dob,
          bankAccount: decrypted.bankAccount,
          bankName: decrypted.bankName,
        },
        timestamp: new Date().toISOString()
      });
    } else {
      // Auditors see redacted
      res.status(200).json({
        success: true,
        data: {
          ...baseData,
          name: '[REDACTED - Admin Only]',
          email: '[REDACTED - Admin Only]',
          note: 'Full PII visible to administrators only'
        },
        timestamp: new Date().toISOString()
      });
    }
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
 * Update staff details
 * PUT /api/staff/:id
 * Access: Admin only
 */
export const updateStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { grade, department, position, email, bankAccount, bankName } = req.body;

    if (!grade && !department && !position && !email && !bankAccount && !bankName) {
      res.status(400).json({
        success: false,
        error: 'At least one field must be provided'
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

    // Update non-encrypted fields
    if (grade) staff.grade = grade;
    if (department) staff.department = department;
    if (position) staff.position = position;

    // Update encrypted fields
    if (email) staff.emailEncrypted = encrypt(email);
    if (bankAccount) staff.bankAccountEncrypted = encrypt(bankAccount);
    if (bankName) staff.bankNameEncrypted = encrypt(bankName);

    staff.updatedBy = req.user!.id as any;
    await staff.save();

    // Decrypt for response (admin only)
    const decrypted = decryptStaffData(staff, req.user!.role);

    res.status(200).json({
      success: true,
      message: 'Staff updated successfully',
      data: {
        id: staff._id,
        staffId: staff.staffId,
        staffHash: staff.staffHash,
        name: decrypted.name,
        email: decrypted.email,
        grade: staff.grade,
        department: staff.department,
        position: staff.position,
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
 * Access: Admin only
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
    staff.updatedBy = req.user!.id as any;
    await staff.save();

    // Decrypt name for response (admin only)
    const decrypted = decryptStaffData(staff, req.user!.role);

    res.status(200).json({
      success: true,
      message: `Staff ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: staff._id,
        staffId: staff.staffId,
        staffHash: staff.staffHash,
        name: decrypted.name,
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
 * Access: Admin or Auditor
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

    // Get staff by employment type
    const byEmploymentType = await Staff.aggregate([
      {
        $group: {
          _id: '$employmentType',
          count: { $sum: 1 }
        }
      }
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
        byGrade,
        byEmploymentType
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