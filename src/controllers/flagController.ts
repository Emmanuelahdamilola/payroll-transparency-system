
import { Response } from 'express';
import { AuthRequest } from '../types';
import Flag from '../models/Flag';
import { analyzeFlags } from '../services/groqService';

/**
 * Get all flags for a payroll batch
 * GET /api/payroll/:id/flags
 */
export const getPayrollFlags = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const flags = await Flag.find({ payrollId: id }).sort({ score: -1, createdAt: -1 });

    // Group by type
    const grouped = {
      ghostWorkers: flags.filter((f) => f.type === 'ghost'),
      duplicates: flags.filter((f) => f.type === 'duplicate'),
      anomalies: flags.filter((f) => f.type === 'anomaly'),
      missingRegistry: flags.filter((f) => f.type === 'missing_registry'),
    };

    res.status(200).json({
      success: true,
      data: {
        total: flags.length,
        grouped,
        allFlags: flags,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Get payroll flags error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve flags',
      message: error.message,
    });
  }
};

/**
 * Get specific flag details
 * GET /api/flags/:id
 */
export const getFlagDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const flag = await Flag.findById(id).populate('reviewedBy', 'firstName lastName email');

    if (!flag) {
      res.status(404).json({
        success: false,
        error: 'Flag not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: flag,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Get flag details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve flag details',
      message: error.message,
    });
  }
};

/**
 * Review/resolve a flag
 * PATCH /api/flags/:id/review
 */
export const reviewFlag = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { resolution, notes } = req.body;

    if (!['confirmed', 'false_positive'].includes(resolution)) {
      res.status(400).json({
        success: false,
        error: 'Invalid resolution. Must be "confirmed" or "false_positive"',
      });
      return;
    }

    const flag = await Flag.findById(id);

    if (!flag) {
      res.status(404).json({
        success: false,
        error: 'Flag not found',
      });
      return;
    }

    flag.reviewed = true;
    flag.reviewedBy = req.user!.id as any;
    flag.reviewedAt = new Date();
    flag.resolution = resolution;
    flag.resolutionNotes = notes || '';

    await flag.save();

    res.status(200).json({
      success: true,
      message: 'Flag reviewed successfully',
      data: flag,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Review flag error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to review flag',
      message: error.message,
    });
  }
};

/**
 * Get all flags (for auditors)
 * GET /api/flags?status=pending&type=ghost
 */
export const getAllFlags = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, type, page = '1', limit = '20' } = req.query;

    const query: any = {};

    if (status === 'pending') {
      query.reviewed = false;
    } else if (status === 'reviewed') {
      query.reviewed = true;
    }

    if (type) {
      query.type = type;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const flags = await Flag.find(query)
      .populate('payrollId', 'month year batchHash')
      .populate('reviewedBy', 'firstName lastName email')
      .sort({ score: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Flag.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        flags,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Get all flags error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve flags',
      message: error.message,
    });
  }
};

/**
 * Get flag statistics
 * GET /api/flags/stats
 */
export const getFlagStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalFlags = await Flag.countDocuments();
    const reviewedFlags = await Flag.countDocuments({ reviewed: true });
    const pendingFlags = await Flag.countDocuments({ reviewed: false });

    const flagsByType = await Flag.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          avgScore: { $avg: '$score' },
        },
      },
    ]);

    const flagsByResolution = await Flag.aggregate([
      { $match: { reviewed: true } },
      {
        $group: {
          _id: '$resolution',
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalFlags,
        reviewed: reviewedFlags,
        pending: pendingFlags,
        byType: flagsByType,
        byResolution: flagsByResolution,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Get flag stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve flag statistics',
      message: error.message,
    });
  }
};

/**
 * Get AI-powered flag analysis
 * GET /api/flags/analyze
 */
export const analyzePayrollFlags = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { payrollId } = req.query;

    let flags;
    if (payrollId) {
      flags = await Flag.find({ payrollId, reviewed: false });
    } else {
      flags = await Flag.find({ reviewed: false }).limit(50);
    }

    const analysis = await analyzeFlags(flags);

    res.status(200).json({
      success: true,
      data: {
        flagCount: flags.length,
        analysis,
        recommendations: analysis,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Analyze flags error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze flags',
      message: error.message,
    });
  }
};

// Export all functions
export default {
  getPayrollFlags,
  getFlagDetails,
  reviewFlag,
  getAllFlags,
  getFlagStats,
  analyzePayrollFlags
};