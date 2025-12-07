import { Response } from 'express';
import { AuthRequest } from '../types';
import Staff from '../models/Staff';
import PayrollBatch from '../models/PayrollBatch';
import Flag from '../models/Flag';
import mongoose from 'mongoose';

/**
 * Get admin dashboard summary
 * GET /api/dashboard/admin-summary
 */
export const getAdminSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get total counts
    const totalStaff = await Staff.countDocuments();
    const totalBatches = await PayrollBatch.countDocuments();
    const totalAnomalies = await Flag.countDocuments();
    const pendingFlags = await Flag.countDocuments({ reviewed: false });

    // Get latest batches
    const latestBatches = await PayrollBatch.find()
      .populate('uploadedBy', 'firstName lastName')
      .select('batchHash month year totalStaff totalAmount status blockchainTx createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get latest blockchain transactions
    const latestTransactions = await PayrollBatch.find({ blockchainTx: { $exists: true, $ne: null } })
      .select('batchHash blockchainTx createdAt status')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get last verification status
    const lastBatch = await PayrollBatch.findOne()
      .sort({ createdAt: -1 })
      .select('status month year flaggedCount createdAt');

    // Get monthly statistics
    const currentYear = new Date().getFullYear();
    const monthlyStats = await PayrollBatch.aggregate([
      {
        $match: {
          year: currentYear
        }
      },
      {
        $group: {
          _id: '$month',
          totalAmount: { $sum: '$totalAmount' },
          totalStaff: { $sum: '$totalStaff' },
          totalFlags: { $sum: '$flaggedCount' },
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
          totalBatches,
          totalAnomalies,
          pendingFlags,
          verifiedStaff: await Staff.countDocuments({ verified: true })
        },
        latestBatches,
        latestTransactions,
        lastVerification: lastBatch ? {
          status: lastBatch.status,
          month: lastBatch.month,
          year: lastBatch.year,
          flaggedCount: lastBatch.flaggedCount,
          date: lastBatch.createdAt
        } : null,
        monthlyStats,
        quickActions: [
          { label: 'Upload Payroll CSV', action: 'upload_payroll' },
          { label: 'Register New Staff', action: 'register_staff' },
          { label: 'View Anomalies', action: 'view_flags' },
          { label: 'Blockchain Explorer', action: 'blockchain_explorer' }
        ]
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Get admin summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve admin dashboard summary',
      message: error.message
    });
  }
};

/**
 * Get auditor dashboard summary
 * GET /api/dashboard/auditor-summary
 */
export const getAuditorSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get flag counts
    const totalFlags = await Flag.countDocuments();
    const pendingReviews = await Flag.countDocuments({ reviewed: false });
    const confirmedFlags = await Flag.countDocuments({ resolution: 'confirmed' });
    const falsePositives = await Flag.countDocuments({ resolution: 'false_positive' });

    // Get verified batches
    const verifiedBatches = await PayrollBatch.countDocuments({ status: 'verified' });
    const pendingBatches = await PayrollBatch.countDocuments({ status: 'processing' });

    // Get flags by category
    const flagsByCategory = await Flag.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          avgScore: { $avg: '$score' },
          pending: {
            $sum: { $cond: [{ $eq: ['$reviewed', false] }, 1, 0] }
          }
        }
      }
    ]);

    // Get recent reviews
    const recentReviews = await Flag.find({ reviewed: true })
      .populate('reviewedBy', 'firstName lastName')
      .populate('payrollId', 'month year batchHash')
      .select('staffHash type resolution reviewedAt resolutionNotes score')
      .sort({ reviewedAt: -1 })
      .limit(10);

    // Get high priority flags (high score, not reviewed)
    const highPriorityFlags = await Flag.find({
      reviewed: false,
      score: { $gte: 0.8 }
    })
      .populate('payrollId', 'month year batchHash')
      .select('staffHash type reason score createdAt')
      .sort({ score: -1 })
      .limit(5);

    // Get flags trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const flagsTrend = await Flag.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          total: { $sum: 1 },
          confirmed: {
            $sum: { $cond: [{ $eq: ['$resolution', 'confirmed'] }, 1, 0] }
          },
          falsePositives: {
            $sum: { $cond: [{ $eq: ['$resolution', 'false_positive'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalFlags,
          pendingReviews,
          confirmedFlags,
          falsePositives,
          verifiedBatches,
          pendingBatches,
          reviewRate: totalFlags > 0 ? ((totalFlags - pendingReviews) / totalFlags * 100).toFixed(1) : 0
        },
        flagsByCategory,
        recentReviews,
        highPriorityFlags,
        flagsTrend
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Get auditor summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve auditor dashboard summary',
      message: error.message
    });
  }
};

/**
 * Get system-wide statistics (Super Admin)
 * GET /api/dashboard/system-stats
 */
export const getSystemStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalStaff,
      totalBatches,
      totalFlags,
      totalUsers,
      blockchainTxCount,
      avgProcessingTime
    ] = await Promise.all([
      Staff.countDocuments(),
      PayrollBatch.countDocuments(),
      Flag.countDocuments(),
      mongoose.connection.collection('users').countDocuments(),
      PayrollBatch.countDocuments({ blockchainTx: { $exists: true, $ne: null } }),
      PayrollBatch.aggregate([
        {
          $project: {
            processingTime: {
              $divide: [
                { $subtract: ['$updatedAt', '$createdAt'] },
                1000 // Convert to seconds
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$processingTime' }
          }
        }
      ])
    ]);

    // Get database size
    const dbStats = mongoose.connection.db ? await mongoose.connection.db.stats() : null;

    res.status(200).json({
      success: true,
      data: {
        systemHealth: {
          status: 'operational',
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          dbSize: dbStats?.dataSize || 0,
          dbStorageSize: dbStats?.storageSize || 0
        },
        statistics: {
          totalStaff,
          totalBatches,
          totalFlags,
          totalUsers,
          blockchainTxCount,
          avgProcessingTime: avgProcessingTime[0]?.avgTime || 0
        },
        performance: {
          apiResponseTime: 'varies per endpoint',
          blockchainSuccessRate: totalBatches > 0 
            ? ((blockchainTxCount / totalBatches) * 100).toFixed(1) + '%'
            : '0%'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Get system stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system statistics',
      message: error.message
    });
  }
};