import { Response } from 'express';
import { AuthRequest } from '../types';
import PayrollBatch from '../models/PayrollBatch';
import Flag from '../models/Flag';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

/**
 * Generate audit report for a payroll batch
 * GET /api/audit/report/:batchId
 */
export const generateAuditReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { batchId } = req.params;
    const format = req.query.format as string || 'pdf'; // 'pdf' or 'json'

    // Fetch batch details
    const batch = await PayrollBatch.findById(batchId)
      .populate('uploadedBy', 'firstName lastName email') as any;

    if (!batch) {
      res.status(404).json({
        success: false,
        error: 'Payroll batch not found'
      });
      return;
    }

    // Fetch all flags for this batch
    const flags = await Flag.find({ payrollId: batchId })
      .populate('reviewedBy', 'firstName lastName')
      .sort({ score: -1 });

    // Prepare report data
    const reportData = {
      batchInfo: {
        batchId: batch._id,
        batchHash: batch.batchHash,
        month: batch.month,
        year: batch.year,
        uploadDate: batch.createdAt,
        uploadedBy: batch.uploadedBy,
        totalStaff: batch.totalStaff,
        totalAmount: batch.totalAmount,
        status: batch.status,
        blockchainTx: batch.blockchainTx
      },
      summary: {
        totalFlags: flags.length,
        reviewedFlags: flags.filter(f => f.reviewed).length,
        pendingFlags: flags.filter(f => !f.reviewed).length,
        confirmedAnomalies: flags.filter(f => f.resolution === 'confirmed').length,
        falsePositives: flags.filter(f => f.resolution === 'false_positive').length,
        flagsByType: {
          ghost: flags.filter(f => f.type === 'ghost').length,
          duplicate: flags.filter(f => f.type === 'duplicate').length,
          anomaly: flags.filter(f => f.type === 'anomaly').length,
          missingRegistry: flags.filter(f => f.type === 'missing_registry').length
        }
      },
      flags: flags.map(flag => ({
        id: flag._id,
        type: flag.type,
        staffHash: flag.staffHash,
        salary: flag.salary,
        reason: flag.reason,
        aiExplanation: flag.aiExplanation,
        score: flag.score,
        reviewed: flag.reviewed,
        resolution: flag.resolution,
        resolutionNotes: flag.resolutionNotes,
        reviewedBy: flag.reviewedBy,
        reviewedAt: flag.reviewedAt,
        createdAt: flag.createdAt
      })),
      auditor: {
        id: req.user!.id,
        name: 'System Auditor',
        generatedAt: new Date()
      },
      blockchain: {
        verified: !!batch.blockchainTx,
        transactionHash: batch.blockchainTx,
        recordedAt: batch.createdAt
      }
    };

    // Return JSON format if requested
    if (format === 'json') {
      res.status(200).json({
        success: true,
        data: reportData,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Generate PDF report
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=audit-report-${batchId}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add header
    doc.fontSize(20).text('PAYROLL AUDIT REPORT', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Batch Information
    doc.fontSize(14).text('Batch Information', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Batch ID: ${reportData.batchInfo.batchId}`);
    doc.text(`Batch Hash: ${reportData.batchInfo.batchHash}`);
    doc.text(`Period: ${getMonthName(reportData.batchInfo.month)} ${reportData.batchInfo.year}`);
    doc.text(`Upload Date: ${new Date(reportData.batchInfo.uploadDate).toLocaleString()}`);
    doc.text(`Uploaded By: ${reportData.batchInfo.uploadedBy?.firstName} ${reportData.batchInfo.uploadedBy?.lastName}`);
    doc.text(`Total Staff: ${reportData.batchInfo.totalStaff}`);
    doc.text(`Total Amount: ₦${reportData.batchInfo.totalAmount.toLocaleString()}`);
    doc.text(`Status: ${reportData.batchInfo.status.toUpperCase()}`);
    doc.moveDown(2);

    // Summary
    doc.fontSize(14).text('Audit Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Total Flags: ${reportData.summary.totalFlags}`);
    doc.text(`Reviewed: ${reportData.summary.reviewedFlags}`);
    doc.text(`Pending Review: ${reportData.summary.pendingFlags}`);
    doc.text(`Confirmed Anomalies: ${reportData.summary.confirmedAnomalies}`);
    doc.text(`False Positives: ${reportData.summary.falsePositives}`);
    doc.moveDown(1);
    doc.text('Flags by Type:');
    doc.text(`  • Ghost Workers: ${reportData.summary.flagsByType.ghost}`);
    doc.text(`  • Duplicates: ${reportData.summary.flagsByType.duplicate}`);
    doc.text(`  • Salary Anomalies: ${reportData.summary.flagsByType.anomaly}`);
    doc.text(`  • Missing Registry: ${reportData.summary.flagsByType.missingRegistry}`);
    doc.moveDown(2);

    // Blockchain Verification
    doc.fontSize(14).text('Blockchain Verification', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Status: ${reportData.blockchain.verified ? 'VERIFIED' : 'NOT VERIFIED'}`);
    if (reportData.blockchain.verified) {
      doc.text(`Transaction Hash: ${reportData.blockchain.transactionHash}`);
      doc.text(`Recorded At: ${new Date(reportData.blockchain.recordedAt).toLocaleString()}`);
    }
    doc.moveDown(2);

    // Detailed Findings (Top 20 flags)
    doc.addPage();
    doc.fontSize(14).text('Detailed Findings', { underline: true });
    doc.moveDown(1);

    const topFlags = reportData.flags.slice(0, 20);
    topFlags.forEach((flag, index) => {
      doc.fontSize(11).text(`${index + 1}. ${getFlagTypeName(flag.type)}`, { underline: true });
      doc.fontSize(9);
      doc.text(`Staff Hash: ${flag.staffHash}`);
      doc.text(`Salary: ₦${flag.salary?.toLocaleString() || 'N/A'}`);
      doc.text(`Confidence Score: ${(flag.score * 100).toFixed(1)}%`);
      doc.text(`Reason: ${flag.reason}`);
      if (flag.aiExplanation) {
        doc.text(`AI Analysis: ${flag.aiExplanation.substring(0, 200)}...`);
      }
      if (flag.reviewed) {
        doc.text(`Resolution: ${flag.resolution?.toUpperCase()}`);
        if (flag.resolutionNotes) {
          doc.text(`Notes: ${flag.resolutionNotes.substring(0, 150)}...`);
        }
      } else {
        doc.text(`Status: PENDING REVIEW`);
      }
      doc.moveDown(1);

      // Add page break if needed
      if (doc.y > 700) {
        doc.addPage();
      }
    });

    if (reportData.flags.length > 20) {
      doc.moveDown(1);
      doc.fontSize(10).text(`... and ${reportData.flags.length - 20} more flags. Download full report in JSON format for complete details.`);
    }

    // Footer
    doc.addPage();
    doc.fontSize(12).text('Audit Certification', { underline: true });
    doc.moveDown(1);
    doc.fontSize(10);
    doc.text('This report has been generated by the Blockchain Payroll Transparency System.');
    doc.text(`Generated by: Auditor (ID: ${reportData.auditor.id})`);
    doc.text(`Generated at: ${reportData.auditor.generatedAt.toLocaleString()}`);
    doc.moveDown(2);
    doc.text('Digital Signature:', { underline: true });
    doc.moveDown(0.5);
    doc.text('[Cryptographic signature would be placed here]');
    doc.moveDown(1);
    doc.fontSize(8).text('This document is confidential and intended for authorized personnel only.', { align: 'center' });

    // Finalize PDF
    doc.end();
  } catch (error: any) {
    console.error('Generate audit report error:', error);
    
    // If headers not sent, send JSON error
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to generate audit report',
        message: error.message
      });
    }
  }
};

/**
 * Get audit statistics
 * GET /api/audit/stats
 */
export const getAuditStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalBatches = await PayrollBatch.countDocuments();
    const verifiedBatches = await PayrollBatch.countDocuments({ status: 'verified' });
    const pendingBatches = await PayrollBatch.countDocuments({ status: 'processing' });
    const failedBatches = await PayrollBatch.countDocuments({ status: 'failed' });

    const totalFlags = await Flag.countDocuments();
    const reviewedFlags = await Flag.countDocuments({ reviewed: true });
    const confirmedFlags = await Flag.countDocuments({ resolution: 'confirmed' });

    // Monthly audit activity
    const monthlyActivity = await PayrollBatch.aggregate([
      {
        $group: {
          _id: {
            year: '$year',
            month: '$month'
          },
          batches: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalStaff: { $sum: '$totalStaff' },
          totalFlags: { $sum: '$flaggedCount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        batches: {
          total: totalBatches,
          verified: verifiedBatches,
          pending: pendingBatches,
          failed: failedBatches
        },
        flags: {
          total: totalFlags,
          reviewed: reviewedFlags,
          confirmed: confirmedFlags,
          reviewRate: totalFlags > 0 ? ((reviewedFlags / totalFlags) * 100).toFixed(1) : 0
        },
        monthlyActivity
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Get audit stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit statistics',
      message: error.message
    });
  }
};

// Helper functions
function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || 'Unknown';
}

function getFlagTypeName(type: string): string {
  const names: { [key: string]: string } = {
    ghost: 'Ghost Worker',
    duplicate: 'Duplicate Entry',
    anomaly: 'Salary Anomaly',
    missing_registry: 'Missing Registry'
  };
  return names[type] || type;
}