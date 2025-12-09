
// src/controllers/dashboardController.ts
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
    // Get total counts in parallel for better performance
    const [
      totalStaff,
      totalBatches,
      totalAnomalies,
      pendingFlags,
      verifiedStaff
    ] = await Promise.all([
      Staff.countDocuments(),
      PayrollBatch.countDocuments(),
      Flag.countDocuments(),
      Flag.countDocuments({ reviewed: false }),
      Staff.countDocuments({ verified: true })
    ]);

    // Get latest batches
    const latestBatches = await PayrollBatch.find()
      .populate('uploadedBy', 'firstName lastName email')
      .select('batchHash month year totalStaff totalAmount status blockchainTx createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Get latest blockchain transactions
    const latestTransactions = await PayrollBatch.find({ 
      blockchainTx: { $exists: true, $ne: null } 
    })
      .select('batchHash blockchainTx createdAt status month year')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Get last verification status
    const lastBatch = await PayrollBatch.findOne()
      .sort({ createdAt: -1 })
      .select('status month year flaggedCount createdAt totalStaff totalAmount')
      .lean();

    // Get monthly statistics for current year
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
          batchCount: { $sum: 1 }
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
          verifiedStaff,
          verificationRate: totalStaff > 0 
            ? parseFloat(((verifiedStaff / totalStaff) * 100).toFixed(2))
            : 0
        },
        latestBatches,
        latestTransactions,
        lastVerification: lastBatch ? {
          status: lastBatch.status,
          month: lastBatch.month,
          year: lastBatch.year,
          flaggedCount: lastBatch.flaggedCount,
          totalStaff: lastBatch.totalStaff,
          totalAmount: lastBatch.totalAmount,
          date: lastBatch.createdAt
        } : null,
        monthlyStats,
        quickActions: [
          { 
            label: 'Upload Payroll CSV', 
            action: 'upload_payroll',
            description: 'Upload new payroll batch for verification'
          },
          { 
            label: 'Register New Staff', 
            action: 'register_staff',
            description: 'Add new staff member to registry'
          },
          { 
            label: 'View Anomalies', 
            action: 'view_flags',
            description: 'Review flagged payroll records'
          },
          { 
            label: 'Blockchain Explorer', 
            action: 'blockchain_explorer',
            description: 'View blockchain transaction history'
          }
        ]
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Get admin summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve admin dashboard summary',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get auditor dashboard summary
 * GET /api/dashboard/auditor-summary
 */
export const getAuditorSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get flag counts in parallel
    const [
      totalFlags,
      pendingReviews,
      confirmedFlags,
      falsePositives,
      verifiedBatches,
      pendingBatches
    ] = await Promise.all([
      Flag.countDocuments(),
      Flag.countDocuments({ reviewed: false }),
      Flag.countDocuments({ resolution: 'confirmed' }),
      Flag.countDocuments({ resolution: 'false_positive' }),
      PayrollBatch.countDocuments({ status: 'verified' }),
      PayrollBatch.countDocuments({ status: 'processing' })
    ]);

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
      },
      { $sort: { count: -1 } }
    ]);

    // Get recent reviews (only those reviewed by current auditor if possible)
    const recentReviews = await Flag.find({ reviewed: true })
      .populate('reviewedBy', 'firstName lastName email')
      .populate('payrollId', 'month year batchHash')
      .select('staffHash type resolution reviewedAt resolutionNotes score')
      .sort({ reviewedAt: -1 })
      .limit(10)
      .lean();

    // Get high priority flags (high score, not reviewed)
    const highPriorityFlags = await Flag.find({
      reviewed: false,
      score: { $gte: 0.8 }
    })
      .populate('payrollId', 'month year batchHash')
      .select('staffHash type reason score createdAt')
      .sort({ score: -1 })
      .limit(5)
      .lean();

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
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$reviewed', false] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Calculate review rate
    const reviewRate = totalFlags > 0 
      ? parseFloat(((totalFlags - pendingReviews) / totalFlags * 100).toFixed(1))
      : 0;

    // Calculate accuracy (confirmed / total reviewed)
    const totalReviewed = confirmedFlags + falsePositives;
    const accuracy = totalReviewed > 0
      ? parseFloat((confirmedFlags / totalReviewed * 100).toFixed(1))
      : 0;

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
          reviewRate,
          accuracy
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
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      avgProcessingTimeResult
    ] = await Promise.all([
      Staff.countDocuments(),
      PayrollBatch.countDocuments(),
      Flag.countDocuments(),
      mongoose.connection.collection('users').countDocuments(),
      PayrollBatch.countDocuments({ blockchainTx: { $exists: true, $ne: null } }),
      PayrollBatch.aggregate([
        {
          $match: {
            updatedAt: { $exists: true },
            createdAt: { $exists: true }
          }
        },
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

    // Get database statistics
    const dbStats = mongoose.connection.db ? await mongoose.connection.db.stats() : null;

    // Calculate blockchain success rate
    const blockchainSuccessRate = totalBatches > 0 
      ? parseFloat(((blockchainTxCount / totalBatches) * 100).toFixed(2))
      : 0;

    // Get memory usage
    const memUsage = process.memoryUsage();
    const formatBytes = (bytes: number) => {
      return (bytes / 1024 / 1024).toFixed(2); // Convert to MB
    };

    // Get active users count
    const activeUsers = await mongoose.connection.collection('users').countDocuments({ 
      isActive: true 
    });

    res.status(200).json({
      success: true,
      data: {
        systemHealth: {
          status: 'operational',
          uptime: Math.floor(process.uptime()), // in seconds
          uptimeFormatted: formatUptime(process.uptime()),
          memoryUsage: {
            rss: `${formatBytes(memUsage.rss)} MB`,
            heapTotal: `${formatBytes(memUsage.heapTotal)} MB`,
            heapUsed: `${formatBytes(memUsage.heapUsed)} MB`,
            external: `${formatBytes(memUsage.external)} MB`
          },
          database: {
            connected: mongoose.connection.readyState === 1,
            dataSize: dbStats ? `${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB` : 'N/A',
            storageSize: dbStats ? `${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB` : 'N/A',
            collections: dbStats?.collections || 0,
            indexes: dbStats?.indexes || 0
          }
        },
        statistics: {
          totalStaff,
          totalBatches,
          totalFlags,
          totalUsers,
          activeUsers,
          blockchainTxCount,
          avgProcessingTime: avgProcessingTimeResult[0]?.avgTime 
            ? `${avgProcessingTimeResult[0].avgTime.toFixed(2)}s` 
            : '0s'
        },
        performance: {
          blockchainSuccessRate: `${blockchainSuccessRate}%`,
          flagRate: totalBatches > 0 
            ? `${((totalFlags / totalBatches) * 100).toFixed(2)}%`
            : '0%',
          averageBatchSize: totalBatches > 0 
            ? Math.round(totalStaff / totalBatches)
            : 0
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Get system stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system statistics',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Helper function to format uptime
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}