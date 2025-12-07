import { EnvConfig } from '../types';

// Validate and export environment variables
export const config: EnvConfig = {
  PORT: process.env.PORT || '5000',
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  STELLAR_NETWORK: (process.env.STELLAR_NETWORK as 'TESTNET' | 'MAINNET' | 'FUTURENET') || 'TESTNET',
  STELLAR_RPC_URL: process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org',
  STELLAR_SECRET_KEY: process.env.STELLAR_SECRET_KEY || '',
  SOROBAN_CONTRACT_ID: process.env.SOROBAN_CONTRACT_ID || '',
  NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development'
};

// Validate required environment variables
export const validateEnv = (): void => {
  const required: (keyof EnvConfig)[] = [
    'MONGODB_URI',
    'JWT_SECRET',
    'STELLAR_RPC_URL',
    'STELLAR_SECRET_KEY'
  ];

  const missing = required.filter(key => !config[key]);

  if (missing.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
    console.warn('Warning: Some features may not work correctly.');
  }
};

// Call validation on import
if (config.NODE_ENV !== 'test') {
  validateEnv();
}

export default config;