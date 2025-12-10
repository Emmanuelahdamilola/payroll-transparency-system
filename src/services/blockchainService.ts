
import {
  Keypair,
  Networks,
  TransactionBuilder,
  Contract,
  xdr,
  SorobanRpc,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
} from '@stellar/stellar-sdk';

import config from '../config/env';

// Initialize Soroban RPC Server
const server = new SorobanRpc.Server(config.STELLAR_RPC_URL);

// Get network passphrase
const getNetworkPassphrase = (): string => {
  switch (config.STELLAR_NETWORK) {
    case 'MAINNET':
      return Networks.PUBLIC;
    case 'TESTNET':
      return Networks.TESTNET;
    case 'FUTURENET':
      return Networks.FUTURENET;
    default:
      return Networks.TESTNET;
  }
};

// Initialize source keypair
let sourceKeypair: Keypair;
try {
  sourceKeypair = Keypair.fromSecret(config.STELLAR_SECRET_KEY);
} catch (error) {
  throw new Error('Invalid STELLAR_SECRET_KEY in .env file');
}

const CONTRACT_ID = config.SOROBAN_CONTRACT_ID;

if (!CONTRACT_ID) {
  console.warn('⚠️  SOROBAN_CONTRACT_ID not set in .env file');
}

/**
 * Create BytesN<32> ScVal from hex string
 */
const createBytes32ScVal = (hexString: string): xdr.ScVal => {
  let cleanHex = hexString.replace(/^0x/, '');
  cleanHex = cleanHex.padStart(64, '0');
  
  if (cleanHex.length !== 64) {
    throw new Error(`Invalid hex length: ${cleanHex.length}, expected 64`);
  }
  
  const buffer = Buffer.from(cleanHex, 'hex');
  return xdr.ScVal.scvBytes(buffer);
};

/**
 * Verify transaction in background (non-blocking)
 */
const verifyTransactionInBackground = async (txHash: string): Promise<void> => {
  try {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
      
      try {
        const response = await server.getTransaction(txHash);
        
        if (response.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
          return;
        }
        
        if (response.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
          console.error(`Transaction failed: ${txHash}`);
          return;
        }
      } catch (error) {
        continue;
      }
    }
  } catch (error) {
    // Silent fail
  }
};

/**
 * Build and submit a transaction - FAST MODE
 */
const submitTransaction = async (
  operation: xdr.Operation
): Promise<{
  transactionHash: string;
  ledger: number;
  status: 'SUCCESS' | 'FAILED';
}> => {
  try {
    const sourceAccount = await server.getAccount(sourceKeypair.publicKey());
    
    const builtTransaction = new TransactionBuilder(sourceAccount, {
      fee: (parseInt(BASE_FEE) * 100).toString(),
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const simulation = await server.simulateTransaction(builtTransaction);

    if (SorobanRpc.Api.isSimulationError(simulation)) {
      throw new Error(`Simulation failed: ${simulation.error}`);
    }

    if (!SorobanRpc.Api.isSimulationSuccess(simulation)) {
      throw new Error('Simulation failed');
    }

    const assembledTx = SorobanRpc.assembleTransaction(
      builtTransaction,
      simulation
    ).build();

    assembledTx.sign(sourceKeypair);
    
    const sendResponse = await server.sendTransaction(assembledTx);

    if (sendResponse.status === 'ERROR') {
      throw new Error(`Failed to send transaction: ${sendResponse.errorResult?.toXDR('base64')}`);
    }

    // FAST MODE: Return immediately after broadcast
    // Transaction will confirm on-chain in 5-10 seconds
    
    // Optional: Start background verification (non-blocking)
    verifyTransactionInBackground(sendResponse.hash).catch(() => {
      // Silent fail - transaction is already broadcast
    });
    
    return {
      transactionHash: sendResponse.hash,
      ledger: 0,
      status: 'SUCCESS'
    };
    
  } catch (error: any) {
    throw error;
  }
};

/**
 * Read-only contract call
 */
const callViewFunction = async (
  functionName: string,
  ...params: xdr.ScVal[]
): Promise<any> => {
  try {
    if (!CONTRACT_ID) {
      throw new Error('Contract ID not configured');
    }

    const contract = new Contract(CONTRACT_ID);
    const sourceAccount = await server.getAccount(sourceKeypair.publicKey());

    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(contract.call(functionName, ...params))
      .setTimeout(30)
      .build();

    const simulated = await server.simulateTransaction(transaction);

    if (SorobanRpc.Api.isSimulationSuccess(simulated)) {
      const result = simulated.result?.retval;
      if (result) {
        return scValToNative(result);
      }
    }

    return null;
  } catch (error: any) {
    return null;
  }
};

/**
 * Register staff on blockchain
 */
export const registerStaffOnChain = async (staffHash: string): Promise<{
  transactionHash: string;
  ledger: number;
  status: 'SUCCESS' | 'FAILED';
}> => {
  try {
    if (!CONTRACT_ID) {
      throw new Error('SOROBAN_CONTRACT_ID not configured in .env');
    }

    const isRegistered = await isStaffRegisteredOnChain(staffHash);
    if (isRegistered) {
      throw new Error('Staff already registered on blockchain');
    }

    const staffHashScVal = createBytes32ScVal(staffHash);
    const contract = new Contract(CONTRACT_ID);
    const operation = contract.call('register_staff', staffHashScVal);

    const result = await submitTransaction(operation);
    
    return result;
  } catch (error: any) {
    throw error;
  }
};

/**
 * Check if staff is registered
 */
export const isStaffRegisteredOnChain = async (staffHash: string): Promise<boolean> => {
  try {
    if (!CONTRACT_ID) {
      return false;
    }

    const staffHashScVal = createBytes32ScVal(staffHash);
    const result = await callViewFunction('is_staff_registered', staffHashScVal);
    return result === true;
  } catch (error: any) {
    return false;
  }
};

/**
 * Check if staff is active
 */
export const isStaffActiveOnChain = async (staffHash: string): Promise<boolean> => {
  try {
    if (!CONTRACT_ID) {
      return false;
    }

    const staffHashScVal = createBytes32ScVal(staffHash);
    const result = await callViewFunction('is_staff_active', staffHashScVal);
    return result === true;
  } catch (error: any) {
    return false;
  }
};

/**
 * Revoke staff
 */
export const revokeStaffOnChain = async (staffHash: string): Promise<{
  transactionHash: string;
  ledger: number;
}> => {
  try {
    if (!CONTRACT_ID) {
      throw new Error('Contract ID not configured');
    }

    const staffHashScVal = createBytes32ScVal(staffHash);
    const contract = new Contract(CONTRACT_ID);
    const operation = contract.call('revoke_staff', staffHashScVal);

    const result = await submitTransaction(operation);
    
    return {
      transactionHash: result.transactionHash,
      ledger: result.ledger
    };
  } catch (error: any) {
    throw error;
  }
};

/**
 * Record payroll batch
 */
export const recordPayrollBatchOnChain = async (
  batchHash: string,
  staffCount: number
): Promise<{
  transactionHash: string;
  ledger: number;
  status: 'SUCCESS' | 'FAILED';
}> => {
  try {
    if (!CONTRACT_ID) {
      throw new Error('Contract ID not configured');
    }

    const batchHashScVal = createBytes32ScVal(batchHash);
    const staffCountScVal = nativeToScVal(staffCount, { type: 'u32' });

    const contract = new Contract(CONTRACT_ID);
    const operation = contract.call(
      'record_payroll_batch',
      batchHashScVal,
      staffCountScVal
    );

    const result = await submitTransaction(operation);
    
    return result;
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get staff record from blockchain
 */
export const getStaffRecordFromChain = async (staffHash: string) => {
  try {
    if (!CONTRACT_ID) {
      throw new Error('Contract ID not configured');
    }

    const staffHashScVal = createBytes32ScVal(staffHash);
    const result = await callViewFunction('get_staff_record', staffHashScVal);
    
    if (!result) {
      throw new Error('Staff record not found');
    }
    
    return {
      staffHash: result.staff_hash,
      registeredBy: result.registered_by,
      registeredAt: new Date(Number(result.registered_at) * 1000),
      isActive: result.is_active
    };
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get total staff count
 */
export const getTotalStaffOnChain = async (): Promise<number> => {
  try {
    if (!CONTRACT_ID) {
      return 0;
    }

    const result = await callViewFunction('get_total_staff');
    return Number(result) || 0;
  } catch (error: any) {
    return 0;
  }
};

/**
 * Check if batch is recorded
 */
export const isBatchRecordedOnChain = async (batchHash: string): Promise<boolean> => {
  try {
    if (!CONTRACT_ID) {
      return false;
    }

    const batchHashScVal = createBytes32ScVal(batchHash);
    const result = await callViewFunction('is_batch_recorded', batchHashScVal);
    return result === true;
  } catch (error: any) {
    return false;
  }
};

/**
 * Verify a transaction succeeded by checking contract state
 */
export const verifyStaffRegistration = async (
  staffHash: string,
  maxRetries: number = 5
): Promise<boolean> => {
  for (let i = 0; i < maxRetries; i++) {
    const isRegistered = await isStaffRegisteredOnChain(staffHash);
    
    if (isRegistered) {
      return true;
    }
    
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return false;
};

export default {
  registerStaffOnChain,
  isStaffRegisteredOnChain,
  isStaffActiveOnChain,
  revokeStaffOnChain,
  recordPayrollBatchOnChain,
  getStaffRecordFromChain,
  getTotalStaffOnChain,
  isBatchRecordedOnChain,
  verifyStaffRegistration,
};