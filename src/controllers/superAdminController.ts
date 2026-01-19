import { Response } from 'express';
import { AuthRequest, UserRole, ActivityAction, EntityType } from '../types';
import ActivityLog from '../models/ActivityLog';
import User from '../models/User';
import Staff from '../models/Staff';
import PayrollBatch from '../models/PayrollBatch';
import { logUserAction, logSystemAction } from '../utils/activityLogger';

/**
 * SuperAdmin Controller
 * Handles all SuperAdmin operations including activity logs, user management, and system reporting
 */

/**
 * Get all activity logs (with filters)
 * GET /api/super-admin/logs/activity
 */
export const getActivityLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Build query filters
    const query: any = {};
    
    if (req.query.userId) query.userId = req.query.userId;
    if (req.query.role) query.role = req.query.role;
    if (req.query.action) query.action = req.query.action;
    if (req.query.entityType) query.entityType = req.query.entityType;
    if (req.query.status) query.status = req.query.status;
    
    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      query.timestamp = {};
      if (req.query.startDate) {
        query.timestamp.$gte = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        query.timestamp.$lte = new Date(req.query.endDate as string);
      }
    }

    const logs = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ActivityLog.countDocuments(query);

    // Log that SuperAdmin viewed logs
    await logSystemAction(
      ActivityAction.AUDIT_LOG_VIEWED,
      req.user!.id,
      req.user!.role,
      req,
      { filters: req.query }
    );

    res.status(200).json({
      success: true,
      data: {
        logs,
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
    console.error('Get activity logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve activity logs',
      message: error.message
    });
  }
};

/**
 * Get authentication logs (login/logout activities)
 * GET /api/super-admin/logs/authentication
 */
export const getAuthenticationLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const logs = await ActivityLog.find({
      action: {
        $in: [
          ActivityAction.LOGIN_SUCCESS,
          ActivityAction.LOGIN_FAILED,
          ActivityAction.LOGOUT,
          ActivityAction.PASSWORD_CHANGED
        ]
      }
    })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ActivityLog.countDocuments({
      action: {
        $in: [
          ActivityAction.LOGIN_SUCCESS,
          ActivityAction.LOGIN_FAILED,
          ActivityAction.LOGOUT,
          ActivityAction.PASSWORD_CHANGED
        ]
      }
    });

    res.status(200).json({
      success: true,
      data: {
        logs,
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
    console.error('Get authentication logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve authentication logs',
      message: error.message
    });
  }
};

/**
 * Get security-related logs (failed logins, status changes)
 * GET /api/super-admin/logs/security
 */
export const getSecurityLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const logs = await ActivityLog.find({
      $or: [
        { action: ActivityAction.LOGIN_FAILED },
        { action: ActivityAction.USER_STATUS_CHANGED },
        { action: ActivityAction.USER_DELETED },
        { status: 'failed' }
      ]
    })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ActivityLog.countDocuments({
      $or: [
        { action: ActivityAction.LOGIN_FAILED },
        { action: ActivityAction.USER_STATUS_CHANGED },
        { action: ActivityAction.USER_DELETED },
        { status: 'failed' }
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        logs,
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
    console.error('Get security logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security logs',
      message: error.message
    });
  }
};

/**
 * Get payroll activity logs
 * GET /api/super-admin/logs/payroll
 */
export const getPayrollActivityLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const logs = await ActivityLog.find({
      entityType: EntityType.PAYROLL
    })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ActivityLog.countDocuments({
      entityType: EntityType.PAYROLL
    });

    res.status(200).json({
      success: true,
      data: {
        logs,
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
    console.error('Get payroll activity logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payroll logs',
      message: error.message
    });
  }
};

/**
 * Get activity history for specific user
 * GET /api/super-admin/logs/user/:userId/history
 */
export const getUserActivityHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const logs = await ActivityLog.find({ userId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ActivityLog.countDocuments({ userId });

    // Get user info
    const user = await User.findById(userId).select('-password');

    res.status(200).json({
      success: true,
      data: {
        user,
        logs,
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
    console.error('Get user activity history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user activity history',
      message: error.message
    });
  }
};

/**
 * Generate comprehensive system report
 * GET /api/super-admin/reports/system
 */
export const generateSystemReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    const endDate = req.query.endDate 
      ? new Date(req.query.endDate as string) 
      : new Date();

    // User statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Staff statistics
    const totalStaff = await Staff.countDocuments();
    const verifiedStaff = await Staff.countDocuments({ verified: true });
    const activeStaff = await Staff.countDocuments({ isActive: true });

    // Payroll statistics
    const totalPayrollBatches = await PayrollBatch.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    const payrollStats = await PayrollBatch.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$totalAmount' },
          totalStaffPaid: { $sum: '$totalStaff' },
          totalFlagged: { $sum: '$flaggedCount' }
        }
      }
    ]);

    // Activity statistics
    const activityStats = await ActivityLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const loginAttempts = await ActivityLog.countDocuments({
      action: { $in: [ActivityAction.LOGIN_SUCCESS, ActivityAction.LOGIN_FAILED] },
      timestamp: { $gte: startDate, $lte: endDate }
    });

    const failedLogins = await ActivityLog.countDocuments({
      action: ActivityAction.LOGIN_FAILED,
      timestamp: { $gte: startDate, $lte: endDate }
    });

    res.status(200).json({
      success: true,
      data: {
        period: {
          startDate,
          endDate
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          byRole: usersByRole
        },
        staff: {
          total: totalStaff,
          verified: verifiedStaff,
          active: activeStaff,
          inactive: totalStaff - activeStaff
        },
        payroll: {
          totalBatches: totalPayrollBatches,
          totalAmount: payrollStats[0]?.totalAmount || 0,
          totalStaffPaid: payrollStats[0]?.totalStaffPaid || 0,
          totalFlagged: payrollStats[0]?.totalFlagged || 0
        },
        activity: {
          totalActions: activityStats.reduce((sum, stat) => sum + stat.count, 0),
          byAction: activityStats,
          loginAttempts,
          failedLogins,
          successRate: loginAttempts > 0 
            ? ((loginAttempts - failedLogins) / loginAttempts * 100).toFixed(2) + '%'
            : '0%'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Generate system report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate system report',
      message: error.message
    });
  }
};

/**
 * Create new admin or auditor (SuperAdmin only)
 * POST /api/super-admin/users/create
 */
export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName || !role) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
      return;
    }

    // Only allow creating ADMIN or AUDITOR, not SUPERADMIN
    if (role !== UserRole.ADMIN && role !== UserRole.AUDITOR) {
      res.status(400).json({
        success: false,
        error: 'Can only create admin or auditor accounts'
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
      return;
    }

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      role,
      isActive: true,
      mustChangePassword: role === UserRole.AUDITOR // Auditors must change password
    });

    // Log the action
    await logUserAction(
      ActivityAction.USER_CREATED,
      req.user!.id,
      req.user!.role,
      user._id.toString(),
      req,
      {
        email: user.email,
        role: user.role,
        createdBy: req.user!.id
      }
    );

    res.status(201).json({
      success: true,
      message: `${role} account created successfully`,
      data: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        mustChangePassword: user.mustChangePassword
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      message: error.message
    });
  }
};

/**
 * Get blockchain transaction statistics
 * GET /api/super-admin/blockchain/stats
 */
export const getBlockchainStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalStaffOnChain = await Staff.countDocuments({ verified: true });
    const totalPayrollsOnChain = await PayrollBatch.countDocuments({ blockchainTx: { $exists: true } });

    const blockchainLogs = await ActivityLog.find({
      entityType: EntityType.BLOCKCHAIN
    }).sort({ timestamp: -1 }).limit(100);

    const successfulTxs = blockchainLogs.filter(log => log.status === 'success').length;
    const failedTxs = blockchainLogs.filter(log => log.status === 'failed').length;

    res.status(200).json({
      success: true,
      data: {
        staff: {
          totalOnChain: totalStaffOnChain,
          totalOffChain: await Staff.countDocuments({ verified: false })
        },
        payroll: {
          totalOnChain: totalPayrollsOnChain,
          totalOffChain: await PayrollBatch.countDocuments({ blockchainTx: { $exists: false } })
        },
        transactions: {
          total: blockchainLogs.length,
          successful: successfulTxs,
          failed: failedTxs,
          successRate: blockchainLogs.length > 0 
            ? ((successfulTxs / blockchainLogs.length) * 100).toFixed(2) + '%'
            : '0%'
        },
        recentTransactions: blockchainLogs.slice(0, 10)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Get blockchain stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve blockchain statistics',
      message: error.message
    });
  }
};