import { Response } from 'express';
import { AuthRequest } from '../types';
import PayrollBatch from '../models/PayrollBatch';
import Staff from '../models/Staff';
import { generateBatchHash } from '../utils/hash';
import { recordPayrollBatchOnChain } from '../services/blockchainService';
import { runAIDetection } from '../services/aiDetectionService';
import { generateBatchSummary } from '../services/groqService';
import fs from 'fs';
import Papa from 'papaparse';
import mongoose from 'mongoose';
import { logPayrollAction, logBlockchainAction } from '../utils/activityLogger';
import { ActivityAction, ActivityStatus } from '../types';

interface CSVRow {
  staffhash?: string;
  salary?: string | number;
  [key: string]: any;
}

/**
 * Upload and process payroll CSV
 * POST /api/payroll/upload
 */
export const uploadPayroll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded. Please upload a CSV file.'
      });
      return;
    }

    const { month, year } = req.body;

    // Validate month and year
    if (!month || !year) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      res.status(400).json({
        success: false,
        error: 'Month and year are required'
      });
      return;
    }

    const payrollMonth = parseInt(month);
    const payrollYear = parseInt(year);

    if (payrollMonth < 1 || payrollMonth > 12) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({
        success: false,
        error: 'Month must be between 1 and 12'
      });
      return;
    }

    if (payrollYear < 2020 || payrollYear > new Date().getFullYear() + 1) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({
        success: false,
        error: 'Invalid year'
      });
      return;
    }

    console.log(`📄 Processing payroll CSV: ${req.file.filename}`);

    // Read and parse CSV file
    const csvContent = fs.readFileSync(req.file.path, 'utf-8');

    const parseResult = Papa.parse<CSVRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      transformHeader: (header: string) => header.trim().toLowerCase()
    });

    if (parseResult.errors.length > 0) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({
        success: false,
        error: 'CSV parsing failed',
        details: parseResult.errors
      });
      return;
    }

    const rows = parseResult.data;

    if (rows.length === 0) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({
        success: false,
        error: 'CSV file is empty'
      });
      return;
    }

    // Validate CSV structure
    const requiredColumns = ['staffhash', 'salary'];
    const firstRow = rows[0];
    if (!firstRow) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({
        success: false,
        error: 'CSV file has no data'
      });
      return;
    }

    const headers = Object.keys(firstRow).map(h => h.toLowerCase());
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));

    if (missingColumns.length > 0) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({
        success: false,
        error: 'CSV missing required columns',
        missing: missingColumns,
        required: requiredColumns
      });
      return;
    }

    // Generate batch hash from CSV content
    const batchHash = generateBatchHash(csvContent);
    console.log(`🔒 Batch hash generated: ${batchHash}`);

    // Check if batch already exists
    const existingBatch = await PayrollBatch.findOne({ batchHash });
    if (existingBatch) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({
        success: false,
        error: 'This payroll batch has already been uploaded',
        batchId: existingBatch._id,
        batchHash
      });
      return;
    }

    // Process payroll records
    const payrollRecords: Array<{
      staffHash: string;
      salary: number;
      status: 'pending' | 'verified' | 'flagged' | 'rejected';
      flags: any[];
    }> = [];
    let totalAmount = 0;

    for (const row of rows) {
      const staffHash = row.staffhash?.toString().trim();
      const salaryValue = typeof row.salary === 'number' ? row.salary : parseFloat(row.salary || '0');

      if (!staffHash || isNaN(salaryValue) || salaryValue <= 0) {
        continue;
      }

      // Check if staff exists in database
      const staffExists = await Staff.findOne({ staffHash });

      payrollRecords.push({
        staffHash,
        salary: salaryValue,
        status: staffExists ? 'pending' : 'flagged',
        flags: []
      });

      totalAmount += salaryValue;
    }

    if (payrollRecords.length === 0) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({
        success: false,
        error: 'No valid payroll records found in CSV'
      });
      return;
    }

    // Create payroll batch document
    const payrollBatch = await PayrollBatch.create({
      batchHash,
      uploadedBy: req.user!.id,
      csvLink: req.file.path,
      uploadedAt: new Date(),
      payrollRecords,
      status: 'processing',
      totalAmount,
      totalStaff: payrollRecords.length,
      flaggedCount: payrollRecords.filter(r => r.status === 'flagged').length,
      month: payrollMonth,
      year: payrollYear
    });

    // Run AI Detection
    const detectionResult = await runAIDetection(
      payrollBatch._id.toString(),
      payrollRecords
    );

    // 🆕 Log payroll upload
    await logPayrollAction(
      ActivityAction.PAYROLL_UPLOADED,
      req.user!.id,
      req.user!.role,
      payrollBatch._id.toString(),
      req,
      {
        batchHash,
        totalStaff: payrollBatch.totalStaff,
        totalAmount: payrollBatch.totalAmount,
        flaggedCount: payrollBatch.flaggedCount,
        month: payrollMonth,
        year: payrollYear
      }
    );
    // Update payroll records with flag references
    for (const flag of detectionResult.flags) {
      const recordIndex = payrollBatch.payrollRecords.findIndex(
        (r) => r.staffHash === flag.staffHash
      );
      if (recordIndex !== -1) {
        payrollBatch.payrollRecords[recordIndex].flags.push(flag._id as mongoose.Types.ObjectId);
        if (payrollBatch.payrollRecords[recordIndex].status === 'pending') {
          payrollBatch.payrollRecords[recordIndex].status = 'flagged';
        }
      }
    }

    // Update flagged count
    payrollBatch.flaggedCount = detectionResult.summary.totalFlags;
    await payrollBatch.save();

    console.log(`✅ AI detection complete: ${detectionResult.summary.totalFlags} flags created`);

    // Generate AI summary
    const aiSummary = await generateBatchSummary({
      totalStaff: payrollBatch.totalStaff,
      totalAmount: payrollBatch.totalAmount,
      flaggedCount: detectionResult.summary.totalFlags,
      ghostWorkers: detectionResult.summary.ghostWorkers,
      duplicates: detectionResult.summary.duplicates,
      salaryAnomalies: detectionResult.summary.salaryAnomalies,
      month: payrollBatch.month,
      year: payrollBatch.year,
    });


    // Record on blockchain
    try {
      const blockchainTx = await recordPayrollBatchOnChain(
        batchHash,
        payrollRecords.length
      );

      // Update batch with blockchain transaction
      payrollBatch.blockchainTx = blockchainTx.transactionHash;
      payrollBatch.status = 'verified';
      await payrollBatch.save();
      //  Log blockchain transaction
      await logBlockchainAction(
        ActivityAction.BLOCKCHAIN_TX_RECORDED,
        req.user!.id,
        req.user!.role,
        blockchainTx.transactionHash,
        req,
        {
          batchHash,
          totalStaff: payrollRecords.length,
          ledger: blockchainTx.ledger
        },
        ActivityStatus.SUCCESS
      );

      


    } catch (blockchainError: any) {
      console.error('Blockchain recording failed:', blockchainError);

      // Log blockchain failure
      await logBlockchainAction(
        ActivityAction.BLOCKCHAIN_TX_FAILED,
        req.user!.id,
        req.user!.role,
        batchHash,
        req,
        {
          batchHash,
          totalStaff: payrollRecords.length,
          error: blockchainError.message
        },
        ActivityStatus.FAILED
      );

      payrollBatch.status = 'failed';
      await payrollBatch.save();
    }


    res.status(201).json({
      success: true,
      message: payrollBatch.blockchainTx
        ? 'Payroll batch uploaded and recorded on blockchain'
        : 'Payroll batch uploaded (blockchain recording failed)',
      data: {
        batchId: payrollBatch._id,
        batchHash: payrollBatch.batchHash,
        totalStaff: payrollBatch.totalStaff,
        totalAmount: payrollBatch.totalAmount,
        flaggedCount: payrollBatch.flaggedCount,
        status: payrollBatch.status,
        blockchainTx: payrollBatch.blockchainTx,
        month: payrollBatch.month,
        year: payrollBatch.year,
        createdAt: payrollBatch.createdAt,
        detectionSummary: detectionResult.summary,
        aiSummary: aiSummary
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Payroll upload error:', error);

    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: 'Payroll upload failed',
      message: error.message
    });
  }
};

/**
 * Get payroll batch by ID
 * GET /api/payroll/:id
 */
export const getPayrollBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const batch = await PayrollBatch.findById(id)
      .populate('uploadedBy', 'firstName lastName email role');

    if (!batch) {
      res.status(404).json({
        success: false,
        error: 'Payroll batch not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: batch,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Get payroll batch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payroll batch',
      message: error.message
    });
  }
};

/**
 * List all payroll batches (paginated)
 * GET /api/payroll?page=1&limit=10
 */
export const listPayrollBatches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const batches = await PayrollBatch.find()
      .populate('uploadedBy', 'firstName lastName email')
      .select('-payrollRecords')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await PayrollBatch.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        batches,
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
    console.error('List payroll batches error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list payroll batches',
      message: error.message
    });
  }
};

/**
 * Get payroll records for a batch
 * GET /api/payroll/:id/records
 */
export const getPayrollRecords = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const batch = await PayrollBatch.findById(id)
      .select('payrollRecords batchHash month year totalAmount');

    if (!batch) {
      res.status(404).json({
        success: false,
        error: 'Payroll batch not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        batchId: batch._id,
        batchHash: batch.batchHash,
        month: batch.month,
        year: batch.year,
        totalAmount: batch.totalAmount,
        records: batch.payrollRecords
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Get payroll records error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payroll records',
      message: error.message
    });
  }
};