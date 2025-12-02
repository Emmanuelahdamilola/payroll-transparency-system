/**
 * Debug test file for Stellar integration
 * This will help identify exactly where the issue is
 */

import dotenv from 'dotenv';
dotenv.config();

import { Keypair, SorobanRpc, Contract } from '@stellar/stellar-sdk';
import { generateStaffHash } from './src/utils/hash';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

const log = {
  error: (msg: string) => console.log(`${COLORS.red}❌ ${msg}${COLORS.reset}`),
  success: (msg: string) => console.log(`${COLORS.green}✅ ${msg}${COLORS.reset}`),
  warn: (msg: string) => console.log(`${COLORS.yellow}⚠️  ${msg}${COLORS.reset}`),
  info: (msg: string) => console.log(`${COLORS.blue}ℹ️  ${msg}${COLORS.reset}`),
  step: (msg: string) => console.log(`${COLORS.magenta}▶️  ${msg}${COLORS.reset}`)
};

async function debugStellarSetup() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🔍 STELLAR INTEGRATION DEBUG TEST');
  console.log('═══════════════════════════════════════════════════════\n');

  // Step 1: Check environment variables
  log.step('Step 1: Checking environment variables...');
  
  const requiredEnvVars = [
    'STELLAR_NETWORK',
    'STELLAR_RPC_URL',
    'STELLAR_SECRET_KEY',
    'SOROBAN_CONTRACT_ID'
  ];

  let envCheckPassed = true;
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (!value) {
      log.error(`${envVar} is not set`);
      envCheckPassed = false;
    } else {
      if (envVar === 'STELLAR_SECRET_KEY') {
        log.success(`${envVar} = S****** (${value.length} chars)`);
      } else if (envVar === 'SOROBAN_CONTRACT_ID') {
        log.success(`${envVar} = ${value.substring(0, 10)}... (${value.length} chars)`);
      } else {
        log.success(`${envVar} = ${value}`);
      }
    }
  }

  if (!envCheckPassed) {
    log.error('Environment variables check failed. Please set all required variables in .env');
    process.exit(1);
  }
  console.log('');

  // Step 2: Validate Stellar secret key
  log.step('Step 2: Validating Stellar secret key...');
  
  let keypair: Keypair;
  try {
    keypair = Keypair.fromSecret(process.env.STELLAR_SECRET_KEY!);
    log.success(`Secret key is valid`);
    log.info(`Public key: ${keypair.publicKey()}`);
  } catch (error: any) {
    log.error(`Invalid secret key: ${error.message}`);
    log.info('Make sure your STELLAR_SECRET_KEY starts with "S" and is 56 characters');
    process.exit(1);
  }
  console.log('');

  // Step 3: Test RPC connection
  log.step('Step 3: Testing Stellar RPC connection...');
  
  const server = new SorobanRpc.Server(process.env.STELLAR_RPC_URL!);
  
  try {
    const health = await server.getHealth();
    log.success(`RPC server is healthy: ${JSON.stringify(health)}`);
  } catch (error: any) {
    log.error(`Cannot connect to RPC: ${error.message}`);
    log.info('Check your STELLAR_RPC_URL');
    process.exit(1);
  }
  console.log('');

  // Step 4: Check account exists and has balance
  log.step('Step 4: Checking account balance...');
  
  try {
    const account = await server.getAccount(keypair.publicKey());
    log.success(`Account found!`);
    
    // Access balances safely
    const accountData = account as any;
    if (accountData.balances && Array.isArray(accountData.balances)) {
      const balance = accountData.balances.find((b: any) => b.asset_type === 'native');
      if (balance) {
        log.info(`XLM Balance: ${balance.balance}`);
        
        const balanceNum = parseFloat(balance.balance);
        if (balanceNum < 1) {
          log.warn('Balance is low. You need at least 1 XLM for testing');
          log.info('Fund your account: soroban keys fund default --network testnet');
        } else {
          log.success('Balance is sufficient');
        }
      }
    }
    
    log.info(`Sequence: ${account.sequenceNumber()}`);
  } catch (error: any) {
    log.error(`Account not found: ${error.message}`);
    log.info('Fund your account with: soroban keys fund default --network testnet');
    process.exit(1);
  }
  console.log('');

  // Step 5: Validate contract ID
  log.step('Step 5: Validating contract...');
  
  const contractId = process.env.SOROBAN_CONTRACT_ID!;
  
  if (!contractId.startsWith('C')) {
    log.error('Contract ID should start with "C"');
    log.info('Example: CA...  or CB...');
    process.exit(1);
  }
  
  if (contractId.length < 56) {
    log.error(`Contract ID too short (${contractId.length} chars, expected 56)`);
    process.exit(1);
  }
  
  log.success(`Contract ID format looks valid`);
  console.log('');

  // Step 6: Try to call a view function
  log.step('Step 6: Testing contract connectivity (get_total_staff)...');
  
  try {
    const contract = new Contract(contractId);
    const sourceAccount = await server.getAccount(keypair.publicKey());
    
    const { TransactionBuilder, Networks, BASE_FEE } = await import('@stellar/stellar-sdk');
    
    const networkPassphrase = process.env.STELLAR_NETWORK === 'MAINNET' 
      ? Networks.PUBLIC 
      : Networks.TESTNET;
    
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(contract.call('get_total_staff'))
      .setTimeout(30)
      .build();

    const simulated = await server.simulateTransaction(transaction);

    if (SorobanRpc.Api.isSimulationError(simulated)) {
      log.error(`Contract call failed: ${simulated.error}`);
      log.info('Possible issues:');
      log.info('  1. Contract not deployed');
      log.info('  2. Contract ID is wrong');
      log.info('  3. Contract not initialized');
      log.info('  4. Network mismatch (testnet vs mainnet)');
      
      console.log('\nFull error:', JSON.stringify(simulated, null, 2));
      process.exit(1);
    }

    if (SorobanRpc.Api.isSimulationSuccess(simulated)) {
      log.success('Contract is accessible!');
      
      const result = simulated.result?.retval;
      if (result) {
        const { scValToNative } = await import('@stellar/stellar-sdk');
        const totalStaff = scValToNative(result);
        log.info(`Current total staff: ${totalStaff}`);
      }
    }
  } catch (error: any) {
    log.error(`Contract test failed: ${error.message}`);
    console.log('\nFull error:', error);
    process.exit(1);
  }
  console.log('');

  // Step 7: Try to register a test staff
  log.step('Step 7: Testing staff registration...');
  
  const testStaffHash = generateStaffHash(
    'Debug Test User',
    '1990-01-01',
    '11111111111',
    '99999999999'
  );
  
  log.info(`Test Staff Hash: ${testStaffHash}`);
  
  try {
    // Import the blockchain service
    const { registerStaffOnChain, isStaffRegisteredOnChain } = await import('./src/services/blockchainService');
    
    // Check if already registered
    const alreadyRegistered = await isStaffRegisteredOnChain(testStaffHash);
    
    if (alreadyRegistered) {
      log.warn('Test staff is already registered (this is OK)');
    } else {
      log.info('Attempting to register test staff...');
      
      const result = await registerStaffOnChain(testStaffHash);
      
      log.success('Registration successful!');
      log.info(`Transaction Hash: ${result.transactionHash}`);
      log.info(`Ledger: ${result.ledger}`);
      log.info(`View on explorer: https://stellar.expert/explorer/testnet/tx/${result.transactionHash}`);
      
      // Wait a bit then verify
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const isNowRegistered = await isStaffRegisteredOnChain(testStaffHash);
      if (isNowRegistered) {
        log.success('Verification passed! Staff is registered on blockchain.');
      } else {
        log.error('Verification failed! Staff not found after registration.');
      }
    }
  } catch (error: any) {
    log.error(`Registration test failed: ${error.message}`);
    
    if (error.message.includes('Already initialized')) {
      log.info('Contract needs initialization. Run:');
      log.info(`  soroban contract invoke --id ${contractId} --network testnet --source-account default -- initialize --owner $(soroban keys address default)`);
    } else if (error.message.includes('Auth failed')) {
      log.info('Authorization failed. Make sure the account that deployed the contract is the owner.');
    } else {
      console.log('\nFull error:', error);
    }
    
    process.exit(1);
  }
  console.log('');

  // Final summary
  console.log('═══════════════════════════════════════════════════════');
  log.success('ALL CHECKS PASSED! ✨');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\nYour Stellar integration is working correctly!\n');
  console.log('Next steps:');
  console.log('  1. Start your server: npm run dev');
  console.log('  2. Register a real staff member via API');
  console.log('  3. Check transactions on Stellar Explorer\n');
}

// Run the debug test
debugStellarSetup()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });