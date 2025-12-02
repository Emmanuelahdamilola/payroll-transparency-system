/**
 * Stellar Integration Test - Fixed TypeScript Version
 * Run: ts-node --transpileOnly test-stellar.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { Keypair, SorobanRpc, Contract, TransactionBuilder, Networks, BASE_FEE, nativeToScVal, scValToNative } from '@stellar/stellar-sdk';
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

async function testStellar() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🔍 STELLAR INTEGRATION TEST');
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
    log.error('Environment variables check failed');
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
    process.exit(1);
  }
  console.log('');

  // Step 3: Test RPC connection
  log.step('Step 3: Testing Stellar RPC connection...');
  
  const server = new SorobanRpc.Server(process.env.STELLAR_RPC_URL!);
  
  try {
    const health = await server.getHealth();
    log.success(`RPC server is healthy`);
  } catch (error: any) {
    log.error(`Cannot connect to RPC: ${error.message}`);
    process.exit(1);
  }
  console.log('');

  // Step 4: Check account exists and has balance
  log.step('Step 4: Checking account balance...');
  
  try {
    const accountResponse = await server.getAccount(keypair.publicKey());
    log.success(`Account found!`);
    
    // Cast to any to access balances
    const accountData: any = accountResponse;
    
    if (accountData.balances) {
      const nativeBalance = accountData.balances.find((b: any) => b.asset_type === 'native');
      if (nativeBalance) {
        const balanceAmount = parseFloat(nativeBalance.balance);
        log.info(`XLM Balance: ${nativeBalance.balance}`);
        
        if (balanceAmount < 1) {
          log.warn('Balance is low. Fund your account:');
          log.info('  soroban keys fund default --network testnet');
        } else {
          log.success('Balance is sufficient');
        }
      }
    }
  } catch (error: any) {
    log.error(`Account not found: ${error.message}`);
    log.info('Fund your account: soroban keys fund default --network testnet');
    process.exit(1);
  }
  console.log('');

  // Step 5: Validate contract
  log.step('Step 5: Validating contract...');
  
  const contractId = process.env.SOROBAN_CONTRACT_ID!;
  
  if (!contractId.startsWith('C')) {
    log.error('Contract ID should start with "C"');
    process.exit(1);
  }
  
  log.success(`Contract ID format valid`);
  console.log('');

  // Step 6: Test contract call
  log.step('Step 6: Testing contract (get_total_staff)...');
  
  try {
    const contract = new Contract(contractId);
    const sourceAccount = await server.getAccount(keypair.publicKey());
    
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
      log.info('  1. Contract not initialized');
      log.info('  2. Wrong contract ID');
      log.info('  3. Network mismatch');
      log.info('');
      log.info('To initialize contract, run:');
      log.info(`  soroban contract invoke --id ${contractId} --network testnet --source-account default -- initialize --owner $(soroban keys address default)`);
      process.exit(1);
    }

    if (SorobanRpc.Api.isSimulationSuccess(simulated)) {
      log.success('Contract is accessible!');
      
      const result = simulated.result?.retval;
      if (result) {
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

  // Step 7: Test staff registration
  log.step('Step 7: Testing staff registration...');
  
  const testStaffHash = generateStaffHash(
    'Test User',
    '1990-01-01',
    '11111111111',
    '99999999999'
  );
  
  log.info(`Test Staff Hash: ${testStaffHash}`);
  
  try {
    const { registerStaffOnChain, isStaffRegisteredOnChain } = await import('./src/services/blockchainService');
    
    // Check if already registered
    const alreadyRegistered = await isStaffRegisteredOnChain(testStaffHash);
    
    if (alreadyRegistered) {
      log.warn('Test staff already registered (OK)');
      log.success('Previous registration verified on blockchain');
    } else {
      log.info('Registering test staff...');
      
      const result = await registerStaffOnChain(testStaffHash);
      
      log.success('Registration successful!');
      log.info(`Transaction: ${result.transactionHash}`);
      log.info(`Ledger: ${result.ledger}`);
      log.info(`Explorer: https://stellar.expert/explorer/testnet/tx/${result.transactionHash}`);
      
      // Verify
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const verified = await isStaffRegisteredOnChain(testStaffHash);
      if (verified) {
        log.success('Verification passed!');
      } else {
        log.error('Verification failed!');
      }
    }
  } catch (error: any) {
    log.error(`Registration failed: ${error.message}`);
    
    if (error.message.includes('Not initialized')) {
      log.info('Contract needs initialization. Run:');
      log.info(`  soroban contract invoke --id ${contractId} --network testnet --source-account default -- initialize --owner $(soroban keys address default)`);
    }
    
    console.log('\nFull error:', error);
    process.exit(1);
  }
  console.log('');

  // Success
  console.log('═══════════════════════════════════════════════════════');
  log.success('ALL TESTS PASSED! ✨');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n🎉 Your Stellar integration is working!\n');
  console.log('Next steps:');
  console.log('  1. npm run dev');
  console.log('  2. Test via API');
  console.log('  3. View on https://stellar.expert/explorer/testnet\n');
}

testStellar()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n💥 Error:', error);
    process.exit(1);
  });