import { Request } from 'express';

// Environment variables type
export interface EnvConfig {
  PORT: string;
  MONGODB_URI: string;
  JWT_SECRET: string;
  GROQ_API_KEY?: string;
  STELLAR_NETWORK: 'TESTNET' | 'MAINNET' | 'FUTURENET';
  STELLAR_RPC_URL: string;
  STELLAR_SECRET_KEY: string;
  SOROBAN_CONTRACT_ID: string;
  NODE_ENV: 'development' | 'production' | 'test';
}

// User roles
export enum UserRole {
  ADMIN = 'admin',
  AUDITOR = 'auditor'
}

// Request with authenticated user
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
  };
}

// Staff registration data
export interface StaffData {
  name: string;
  dob: Date;
  bvn: string;
  nin: string;
  phone: string;
  grade: string;
  department: string;
}

// Staff document (stored in MongoDB)
export interface StaffDocument extends StaffData {
  staffHash: string;
  bvnHash: string;
  ninHash: string;
  phoneHash: string;
  blockchainTxs: string[];
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Payroll record within a batch
export interface PayrollRecord {
  staffHash: string;
  salary: number;
  status: 'pending' | 'verified' | 'flagged' | 'rejected';
  flags: string[]; // References to Flag IDs
}

// Payroll batch document
export interface PayrollBatch {
  batchHash: string;
  uploadedBy: string;
  csvLink: string;
  uploadedAt: Date;
  payrollRecords: PayrollRecord[];
  blockchainTx?: string;
  status: 'processing' | 'verified' | 'completed';
}

// Flag types
export enum FlagType {
  DUPLICATE = 'duplicate',
  ANOMALY = 'anomaly',
  GHOST = 'ghost',
  MISSING_REGISTRY = 'missing_registry'
}

// Flag document
export interface Flag {
  payrollId: string;
  staffHash: string;
  type: FlagType;
  score: number; // Confidence score 0-1
  explanation: string;
  metadata?: Record<string, any>;
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// Stellar transaction result
export interface StellarTxResult {
  transactionHash: string;
  ledger: number;
  status: 'SUCCESS' | 'FAILED';
}