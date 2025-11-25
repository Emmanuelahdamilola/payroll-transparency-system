import { EnvConfig } from '../types';

// Validate and export environment variables
export const config: EnvConfig = {
  PORT: process.env.PORT || '5000',
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL || 'http://localhost:8545',
  ETHEREUM_PRIVATE_KEY: process.env.ETHEREUM_PRIVATE_KEY || '',
  NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development'
};

// Validate required environment variables
export const validateEnv = (): void => {
  const required: (keyof EnvConfig)[] = [
    'MONGODB_URI',
    'JWT_SECRET',
    'ETHEREUM_RPC_URL',
    'ETHEREUM_PRIVATE_KEY'
  ];

  const missing = required.filter(key => !config[key]);

  if (missing.length > 0) {
    console.warn(`⚠️  Warning: Missing environment variables: ${missing.join(', ')}`);
    console.warn('⚠️  Some features may not work correctly.');
  }
};

// Call validation on import
if (config.NODE_ENV !== 'test') {
  validateEnv();
}

export default config;