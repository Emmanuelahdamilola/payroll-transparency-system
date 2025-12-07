// import { Response } from 'express';
// import { AuthRequest } from '../types';
// import Staff from '../models/Staff';
// import PayrollBatch from '../models/PayrollBatch';

// /**
//  * Get recent blockchain transactions
//  * GET /api/blockchain/recent-tx
//  */
// export const getRecentTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
//   try {
//     const limit = parseInt(req.query.limit as string) || 10;

//     // Get staff registration transactions
//     const staffTxs = await Staff.find({ blockchainTxs: { $exists: true, $ne: [] } })
//       .select('staffHash blockchainTxs createdAt department grade verified')
//       .sort({ createdAt: -1 })
//       .limit(limit);

//     // Get payroll batch transactions
//     const batchTxs = await PayrollBatch.find({ blockchainTx: { $exists: true, $ne: null } })
//       .select('batchHash blockchainTx month year totalStaff totalAmount status createdAt')
//       .populate('uploadedBy', 'firstName lastName')
//       .sort({ createdAt: -1 })
//       .limit(limit);

//     // Combine and format transactions
//     const staffTransactions = staffTxs.flatMap(staff => 
//       staff.blockchainTxs.map(tx => ({
//         type: 'staff_registration',
//         transactionHash: tx,
//         staffHash: staff.staffHash,
//         department: staff.department,
//         grade: staff.grade,
//         verified: staff.verified,
//         timestamp: staff.createdAt
//       }))
//     );

//     const batchTransactions = batchTxs.map(batch => ({
//       type: 'payroll_batch',
//       transactionHash: batch.blockchainTx,
//       batchHash: batch.batchHash,
//       batchId: batch._id,
//       month: batch.month,
//       year: batch.year,
//       totalStaff: batch.totalStaff,
//       totalAmount: batch.totalAmount,
//       status: batch.status,
//       uploadedBy: batch.uploadedBy,
//       timestamp: batch.createdAt
//     }));

//     // Combine and sort by timestamp
//     const allTransactions = [...staffTransactions, ...batchTransactions]
//       .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
//       .slice(0, limit);

//     res.status(200).json({
//       success: true,
//       data: {
//         transactions: allTransactions,
//         total: allTransactions.length,
//         staffCount: staffTransactions.length,
//         batchCount: batchTransactions.length
//       },
//       timestamp: new Date().toISOString()
//     });
//   } catch (error: any) {
//     console.error('Get recent transactions error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to retrieve blockchain transactions',
//       message: error.message
//     });
//   }
// };

// /**
//  * Get blockchain transaction details
//  * GET /api/blockchain/tx/:transactionHash
//  */
// export const getTransactionDetails = async (req: AuthRequest, res: Response): Promise<void> => {
//   try {
//     const { transactionHash } = req.params;

//     // Search in staff registrations
//     const staff = await Staff.findOne({ blockchainTxs: transactionHash })
//       .select('staffHash blockchainTxs createdAt department grade verified');

//     if (staff) {
//       res.status(200).json({
//         success: true,
//         data: {
//           type: 'staff_registration',
//           transactionHash,
//           staffHash: staff.staffHash,
//           department: staff.department,
//           grade: staff.grade,
//           verified: staff.verified,
//           timestamp: staff.createdAt,
//           allTransactions: staff.blockchainTxs
//         },
//         timestamp: new Date().toISOString()
//       });
//       return;
//     }

//     // Search in payroll batches
//     const batch = await PayrollBatch.findOne({ blockchainTx: transactionHash })
//       .populate('uploadedBy', 'firstName lastName email');

//     if (batch) {
//       res.status(200).json({
//         success: true,
//         data: {
//           type: 'payroll_batch',
//           transactionHash,
//           batchId: batch._id,
//           batchHash: batch.batchHash,
//           month: batch.month,
//           year: batch.year,
//           totalStaff: batch.totalStaff,
//           totalAmount: batch.totalAmount,
//           flaggedCount: batch.flaggedCount,
//           status: batch.status,
//           uploadedBy: batch.uploadedBy,
//           timestamp: batch.createdAt
//         },
//         timestamp: new Date().toISOString()
//       });
//       return;
//     }

//     // Transaction not found
//     res.status(404).json({
//       success: false,
//       error: 'Transaction not found in system records'
//     });
//   } catch (error: any) {
//     console.error('Get transaction details error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to retrieve transaction details',
//       message: error.message
//     });
//   }
// };

// /**
//  * Get blockchain event logs
//  * GET /api/blockchain/logs
//  */
// export const getBlockchainLogs = async (req: AuthRequest, res: Response): Promise<void> => {
//   try {
//     const page = parseInt(req.query.page as string) || 1;
//     const limit = parseInt(req.query.limit as string) || 20;
//     const eventType = req.query.type as string; // 'staff' | 'payroll' | 'all'
//     const skip = (page - 1) * limit;

//     let logs: any[] = [];
//     let total = 0;

//     if (eventType === 'staff' || !eventType || eventType === 'all') {
//       const staffLogs = await Staff.find({ blockchainTxs: { $exists: true, $ne: [] } })
//         .select('staffHash blockchainTxs createdAt department grade verified')
//         .sort({ createdAt: -1 })
//         .skip(eventType === 'staff' ? skip : 0)
//         .limit(eventType === 'staff' ? limit : limit * 2);

//       const staffEvents = staffLogs.flatMap(staff =>
//         staff.blockchainTxs.map(tx => ({
//           eventType: 'StaffRegistered',
//           transactionHash: tx,
//           staffHash: staff.staffHash,
//           department: staff.department,
//           grade: staff.grade,
//           verified: staff.verified,
//           timestamp: staff.createdAt,
//           blockNumber: null 
//         }))
//       );

//       logs.push(...staffEvents);
//       if (eventType === 'staff') {
//         total = await Staff.countDocuments({ blockchainTxs: { $exists: true, $ne: [] } });
//       }
//     }

//     if (eventType === 'payroll' || !eventType || eventType === 'all') {
//       const batchLogs = await PayrollBatch.find({ blockchainTx: { $exists: true, $ne: null } })
//         .select('batchHash blockchainTx month year totalStaff totalAmount status createdAt')
//         .populate('uploadedBy', 'firstName lastName')
//         .sort({ createdAt: -1 })
//         .skip(eventType === 'payroll' ? skip : 0)
//         .limit(eventType === 'payroll' ? limit : limit * 2);

//       const batchEvents = batchLogs.map(batch => ({
//         eventType: 'PayrollBatchRecorded',
//         transactionHash: batch.blockchainTx,
//         batchHash: batch.batchHash,
//         batchId: batch._id,
//         month: batch.month,
//         year: batch.year,
//         totalStaff: batch.totalStaff,
//         totalAmount: batch.totalAmount,
//         status: batch.status,
//         uploadedBy: batch.uploadedBy,
//         timestamp: batch.createdAt,
//         blockNumber: null
//       }));

//       logs.push(...batchEvents);
//       if (eventType === 'payroll') {
//         total = await PayrollBatch.countDocuments({ blockchainTx: { $exists: true, $ne: null } });
//       }
//     }

//     // Sort combined logs by timestamp and apply pagination for 'all'
//     logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
//     if (!eventType || eventType === 'all') {
//       total = logs.length;
//       logs = logs.slice(skip, skip + limit);
//     }

//     res.status(200).json({
//       success: true,
//       data: {
//         logs,
//         pagination: {
//           page,
//           limit,
//           total,
//           pages: Math.ceil(total / limit)
//         },
//         filter: eventType || 'all'
//       },
//       timestamp: new Date().toISOString()
//     });
//   } catch (error: any) {
//     console.error('Get blockchain logs error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to retrieve blockchain logs',
//       message: error.message
//     });
//   }
// };

// /**
//  * Get blockchain proof for staff
//  * GET /api/blockchain/proof/staff/:staffHash
//  */
// export const getStaffBlockchainProof = async (req: AuthRequest, res: Response): Promise<void> => {
//   try {
//     const { staffHash } = req.params;

//     const staff = await Staff.findOne({ staffHash })
//       .select('staffHash blockchainTxs createdAt department grade verified');

//     if (!staff) {
//       res.status(404).json({
//         success: false,
//         error: 'Staff not found'
//       });
//       return;
//     }

//     res.status(200).json({
//       success: true,
//       data: {
//         staffHash: staff.staffHash,
//         department: staff.department,
//         grade: staff.grade,
//         verified: staff.verified,
//         registrationDate: staff.createdAt,
//         blockchainTransactions: staff.blockchainTxs,
//         proof: {
//           onChain: staff.blockchainTxs.length > 0,
//           transactionCount: staff.blockchainTxs.length,
//           firstTransaction: staff.blockchainTxs[0] || null,
//           verificationStatus: staff.verified ? 'verified' : 'pending'
//         }
//       },
//       timestamp: new Date().toISOString()
//     });
//   } catch (error: any) {
//     console.error('Get staff blockchain proof error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to retrieve blockchain proof',
//       message: error.message
//     });
//   }
// };

// /**
//  * Get blockchain proof for payroll batch
//  * GET /api/blockchain/proof/batch/:batchId
//  */
// export const getBatchBlockchainProof = async (req: AuthRequest, res: Response): Promise<void> => {
//   try {
//     const { batchId } = req.params;

//     const batch = await PayrollBatch.findById(batchId)
//       .populate('uploadedBy', 'firstName lastName email');

//     if (!batch) {
//       res.status(404).json({
//         success: false,
//         error: 'Payroll batch not found'
//       });
//       return;
//     }

//     res.status(200).json({
//       success: true,
//       data: {
//         batchId: batch._id,
//         batchHash: batch.batchHash,
//         month: batch.month,
//         year: batch.year,
//         totalStaff: batch.totalStaff,
//         totalAmount: batch.totalAmount,
//         uploadedBy: batch.uploadedBy,
//         uploadDate: batch.createdAt,
//         blockchainTransaction: batch.blockchainTx,
//         proof: {
//           onChain: !!batch.blockchainTx,
//           transactionHash: batch.blockchainTx || null,
//           verificationStatus: batch.status,
//           recordedAt: batch.blockchainTx ? batch.createdAt : null
//         }
//       },
//       timestamp: new Date().toISOString()
//     });
//   } catch (error: any) {
//     console.error('Get batch blockchain proof error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to retrieve blockchain proof',
//       message: error.message
//     });
//   }
// };


import { Response } from 'express';
import { AuthRequest } from '../types';
import Staff from '../models/Staff';
import PayrollBatch from '../models/PayrollBatch';
import { SorobanRpc } from '@stellar/stellar-sdk';
import config from '../config/env';

// Initialize Soroban RPC Server for fetching transaction details
const server = new SorobanRpc.Server(config.STELLAR_RPC_URL);

/**
 * Helper function to get block number from transaction hash
 */
const getBlockNumberFromTx = async (txHash: string): Promise<number | null> => {
  try {
    const txResponse = await server.getTransaction(txHash);
    if (txResponse.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      return txResponse.ledger || null;
    }
    return null;
  } catch (error) {
    console.error(`Failed to get block for tx ${txHash.substring(0, 8)}...`, error);
    return null;
  }
};

/**
 * Get recent blockchain transactions
 * GET /api/blockchain/recent-tx
 */
export const getRecentTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    // Get staff registration transactions
    const staffTxs = await Staff.find({ blockchainTxs: { $exists: true, $ne: [] } })
      .select('staffHash blockchainTxs createdAt department grade verified')
      .sort({ createdAt: -1 })
      .limit(limit);

    // Get payroll batch transactions
    const batchTxs = await PayrollBatch.find({ blockchainTx: { $exists: true, $ne: null } })
      .select('batchHash blockchainTx month year totalStaff totalAmount status createdAt')
      .populate('uploadedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit);

    // Combine and format transactions
    const staffTransactions = staffTxs.flatMap(staff => 
      staff.blockchainTxs.map(tx => ({
        type: 'staff_registration',
        transactionHash: tx,
        staffHash: staff.staffHash,
        department: staff.department,
        grade: staff.grade,
        verified: staff.verified,
        timestamp: staff.createdAt,
        explorerUrl: `https://stellar.expert/explorer/${config.STELLAR_NETWORK.toLowerCase()}/tx/${tx}`
      }))
    );

    const batchTransactions = batchTxs.map(batch => ({
      type: 'payroll_batch',
      transactionHash: batch.blockchainTx,
      batchHash: batch.batchHash,
      batchId: batch._id,
      month: batch.month,
      year: batch.year,
      totalStaff: batch.totalStaff,
      totalAmount: batch.totalAmount,
      status: batch.status,
      uploadedBy: batch.uploadedBy,
      timestamp: batch.createdAt,
      explorerUrl: `https://stellar.expert/explorer/${config.STELLAR_NETWORK.toLowerCase()}/tx/${batch.blockchainTx}`
    }));

    // Combine and sort by timestamp
    const allTransactions = [...staffTransactions, ...batchTransactions]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    res.status(200).json({
      success: true,
      data: {
        transactions: allTransactions,
        total: allTransactions.length,
        staffCount: staffTransactions.length,
        batchCount: batchTransactions.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Get recent transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve blockchain transactions',
      message: error.message
    });
  }
};

/**
 * Get blockchain transaction details
 * GET /api/blockchain/tx/:transactionHash
 */
export const getTransactionDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { transactionHash } = req.params;

    // Search in staff registrations
    const staff = await Staff.findOne({ blockchainTxs: transactionHash })
      .select('staffHash blockchainTxs createdAt department grade verified');

    if (staff) {
      // Try to get block number from blockchain
      const blockNumber = await getBlockNumberFromTx(transactionHash);

      res.status(200).json({
        success: true,
        data: {
          type: 'staff_registration',
          transactionHash,
          staffHash: staff.staffHash,
          department: staff.department,
          grade: staff.grade,
          verified: staff.verified,
          timestamp: staff.createdAt,
          blockNumber,
          allTransactions: staff.blockchainTxs,
          explorerUrl: `https://stellar.expert/explorer/${config.STELLAR_NETWORK.toLowerCase()}/tx/${transactionHash}`
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Search in payroll batches
    const batch = await PayrollBatch.findOne({ blockchainTx: transactionHash })
      .populate('uploadedBy', 'firstName lastName email');

    if (batch) {
      // Try to get block number from blockchain
      const blockNumber = await getBlockNumberFromTx(transactionHash);

      res.status(200).json({
        success: true,
        data: {
          type: 'payroll_batch',
          transactionHash,
          batchId: batch._id,
          batchHash: batch.batchHash,
          month: batch.month,
          year: batch.year,
          totalStaff: batch.totalStaff,
          totalAmount: batch.totalAmount,
          flaggedCount: batch.flaggedCount,
          status: batch.status,
          uploadedBy: batch.uploadedBy,
          timestamp: batch.createdAt,
          blockNumber,
          explorerUrl: `https://stellar.expert/explorer/${config.STELLAR_NETWORK.toLowerCase()}/tx/${transactionHash}`
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Transaction not found
    res.status(404).json({
      success: false,
      error: 'Transaction not found in system records'
    });
  } catch (error: any) {
    console.error('Get transaction details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve transaction details',
      message: error.message
    });
  }
};

/**
 * Get blockchain event logs
 * GET /api/blockchain/logs?type=staff|payroll|all&page=1&limit=20
 */
export const getBlockchainLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const eventType = req.query.type as string; // 'staff' | 'payroll' | 'all'
    const skip = (page - 1) * limit;

    let logs: any[] = [];
    let total = 0;

    if (eventType === 'staff' || !eventType || eventType === 'all') {
      const staffLogs = await Staff.find({ blockchainTxs: { $exists: true, $ne: [] } })
        .select('staffHash blockchainTxs createdAt department grade verified')
        .sort({ createdAt: -1 })
        .skip(eventType === 'staff' ? skip : 0)
        .limit(eventType === 'staff' ? limit : limit * 2);

      const staffEvents = staffLogs.flatMap(staff =>
        staff.blockchainTxs.map(tx => ({
          eventType: 'StaffRegistered',
          transactionHash: tx,
          staffHash: staff.staffHash,
          department: staff.department,
          grade: staff.grade,
          verified: staff.verified,
          timestamp: staff.createdAt,
          blockNumber: null, // Will be fetched on-demand via getTransactionDetails
          explorerUrl: `https://stellar.expert/explorer/${config.STELLAR_NETWORK.toLowerCase()}/tx/${tx}`
        }))
      );

      logs.push(...staffEvents);
      if (eventType === 'staff') {
        total = await Staff.countDocuments({ blockchainTxs: { $exists: true, $ne: [] } });
      }
    }

    if (eventType === 'payroll' || !eventType || eventType === 'all') {
      const batchLogs = await PayrollBatch.find({ blockchainTx: { $exists: true, $ne: null } })
        .select('batchHash blockchainTx month year totalStaff totalAmount status createdAt')
        .populate('uploadedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(eventType === 'payroll' ? skip : 0)
        .limit(eventType === 'payroll' ? limit : limit * 2);

      const batchEvents = batchLogs.map(batch => ({
        eventType: 'PayrollBatchRecorded',
        transactionHash: batch.blockchainTx,
        batchHash: batch.batchHash,
        batchId: batch._id,
        month: batch.month,
        year: batch.year,
        totalStaff: batch.totalStaff,
        totalAmount: batch.totalAmount,
        status: batch.status,
        uploadedBy: batch.uploadedBy,
        timestamp: batch.createdAt,
        blockNumber: null, // Will be fetched on-demand
        explorerUrl: `https://stellar.expert/explorer/${config.STELLAR_NETWORK.toLowerCase()}/tx/${batch.blockchainTx}`
      }));

      logs.push(...batchEvents);
      if (eventType === 'payroll') {
        total = await PayrollBatch.countDocuments({ blockchainTx: { $exists: true, $ne: null } });
      }
    }

    // Sort combined logs by timestamp and apply pagination for 'all'
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (!eventType || eventType === 'all') {
      total = logs.length;
      logs = logs.slice(skip, skip + limit);
    }

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        filter: eventType || 'all',
        note: 'Block numbers are fetched on-demand via /api/blockchain/tx/:hash endpoint for performance'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Get blockchain logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve blockchain logs',
      message: error.message
    });
  }
};

/**
 * Get blockchain proof for staff
 * GET /api/blockchain/proof/staff/:staffHash
 */
export const getStaffBlockchainProof = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { staffHash } = req.params;

    const staff = await Staff.findOne({ staffHash })
      .select('staffHash blockchainTxs createdAt department grade verified');

    if (!staff) {
      res.status(404).json({
        success: false,
        error: 'Staff not found'
      });
      return;
    }

    // Get block number for first transaction if exists
    let blockNumber = null;
    if (staff.blockchainTxs.length > 0) {
      blockNumber = await getBlockNumberFromTx(staff.blockchainTxs[0]);
    }

    res.status(200).json({
      success: true,
      data: {
        staffHash: staff.staffHash,
        department: staff.department,
        grade: staff.grade,
        verified: staff.verified,
        registrationDate: staff.createdAt,
        blockchainTransactions: staff.blockchainTxs,
        proof: {
          onChain: staff.blockchainTxs.length > 0,
          transactionCount: staff.blockchainTxs.length,
          firstTransaction: staff.blockchainTxs[0] || null,
          blockNumber,
          verificationStatus: staff.verified ? 'verified' : 'pending',
          explorerUrl: staff.blockchainTxs[0] 
            ? `https://stellar.expert/explorer/${config.STELLAR_NETWORK.toLowerCase()}/tx/${staff.blockchainTxs[0]}`
            : null
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Get staff blockchain proof error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve blockchain proof',
      message: error.message
    });
  }
};

/**
 * Get blockchain proof for payroll batch
 * GET /api/blockchain/proof/batch/:batchId
 */
export const getBatchBlockchainProof = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { batchId } = req.params;

    const batch = await PayrollBatch.findById(batchId)
      .populate('uploadedBy', 'firstName lastName email');

    if (!batch) {
      res.status(404).json({
        success: false,
        error: 'Payroll batch not found'
      });
      return;
    }

    // Get block number if transaction exists
    let blockNumber = null;
    if (batch.blockchainTx) {
      blockNumber = await getBlockNumberFromTx(batch.blockchainTx);
    }

    res.status(200).json({
      success: true,
      data: {
        batchId: batch._id,
        batchHash: batch.batchHash,
        month: batch.month,
        year: batch.year,
        totalStaff: batch.totalStaff,
        totalAmount: batch.totalAmount,
        uploadedBy: batch.uploadedBy,
        uploadDate: batch.createdAt,
        blockchainTransaction: batch.blockchainTx,
        proof: {
          onChain: !!batch.blockchainTx,
          transactionHash: batch.blockchainTx || null,
          blockNumber,
          verificationStatus: batch.status,
          recordedAt: batch.blockchainTx ? batch.createdAt : null,
          explorerUrl: batch.blockchainTx 
            ? `https://stellar.expert/explorer/${config.STELLAR_NETWORK.toLowerCase()}/tx/${batch.blockchainTx}`
            : null
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Get batch blockchain proof error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve blockchain proof',
      message: error.message
    });
  }
};