import { ethers } from 'ethers';
import config from '../config/env';
import StaffRegistryABI from '../../artifacts/contracts/StaffRegistry.sol/StaffRegistry.json';

// Initialize provider and wallet
const provider = new ethers.JsonRpcProvider(config.ETHEREUM_RPC_URL);
const wallet = new ethers.Wallet(config.ETHEREUM_PRIVATE_KEY, provider);

// Get contract address from environment
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '';

if (!CONTRACT_ADDRESS) {
  console.warn('⚠️  CONTRACT_ADDRESS not set in .env file');
}

// Initialize contract instance
const staffRegistryContract = new ethers.Contract(
  CONTRACT_ADDRESS,
  StaffRegistryABI.abi,
  wallet
);

/**
 * Register staff hash on blockchain
 */
export const registerStaffOnChain = async (staffHash: string): Promise<{
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
}> => {
  try {
    console.log(`📝 Registering staff on blockchain: ${staffHash}`);
    
    // Convert hex string to bytes32 format (must start with 0x)
    const bytes32Hash = '0x' + staffHash;
    
    // Send transaction
    const tx = await staffRegistryContract.registerStaff(bytes32Hash);
    console.log(`⏳ Transaction sent: ${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    
    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  } catch (error: any) {
    console.error('Blockchain registration error:', error);
    throw new Error(`Failed to register staff on blockchain: ${error.message}`);
  }
};

/**
 * Check if staff is registered on blockchain
 */
export const isStaffRegisteredOnChain = async (staffHash: string): Promise<boolean> => {
  try {
    const bytes32Hash = '0x' + staffHash;
    return await staffRegistryContract.isStaffRegistered(bytes32Hash);
  } catch (error: any) {
    console.error('Blockchain check error:', error);
    return false;
  }
};

/**
 * Check if staff is active on blockchain
 */
export const isStaffActiveOnChain = async (staffHash: string): Promise<boolean> => {
  try {
    const bytes32Hash = '0x' + staffHash;
    return await staffRegistryContract.isStaffActive(bytes32Hash);
  } catch (error: any) {
    console.error('Blockchain check error:', error);
    return false;
  }
};

/**
 * Revoke staff on blockchain
 */
export const revokeStaffOnChain = async (staffHash: string): Promise<{
  transactionHash: string;
  blockNumber: number;
}> => {
  try {
    const bytes32Hash = '0x' + staffHash;
    const tx = await staffRegistryContract.revokeStaff(bytes32Hash);
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error: any) {
    console.error('Blockchain revoke error:', error);
    throw new Error(`Failed to revoke staff on blockchain: ${error.message}`);
  }
};

/**
 * Record payroll batch on blockchain
 */
export const recordPayrollBatchOnChain = async (
  batchHash: string,
  staffCount: number
): Promise<{
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
}> => {
  try {
    console.log(`📝 Recording payroll batch on blockchain: ${batchHash}`);
    
    const bytes32Hash = '0x' + batchHash;
    const tx = await staffRegistryContract.recordPayrollBatch(bytes32Hash, staffCount);
    console.log(`⏳ Transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Batch recorded in block ${receipt.blockNumber}`);
    
    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  } catch (error: any) {
    console.error('Blockchain batch recording error:', error);
    throw new Error(`Failed to record batch on blockchain: ${error.message}`);
  }
};

/**
 * Get staff record from blockchain
 */
export const getStaffRecordFromChain = async (staffHash: string) => {
  try {
    const bytes32Hash = '0x' + staffHash;
    const record = await staffRegistryContract.getStaffRecord(bytes32Hash);
    
    return {
      staffHash: record.staffHash,
      registeredBy: record.registeredBy,
      registeredAt: new Date(Number(record.registeredAt) * 1000),
      isActive: record.isActive
    };
  } catch (error: any) {
    console.error('Blockchain get record error:', error);
    throw new Error(`Failed to get staff record: ${error.message}`);
  }
};

/**
 * Get total number of registered staff on blockchain
 */
export const getTotalStaffOnChain = async (): Promise<number> => {
  try {
    const total = await staffRegistryContract.getTotalStaff();
    return Number(total);
  } catch (error: any) {
    console.error('Blockchain total staff error:', error);
    return 0;
  }
};

export default {
  registerStaffOnChain,
  isStaffRegisteredOnChain,
  isStaffActiveOnChain,
  revokeStaffOnChain,
  recordPayrollBatchOnChain,
  getStaffRecordFromChain,
  getTotalStaffOnChain
};