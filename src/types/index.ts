
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

// Payroll record status
export enum PayrollStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FLAGGED = 'flagged',
  REJECTED = 'rejected'
}

// Payroll record within a batch
export interface PayrollRecord {
  staffHash: string;
  salary: number;
  status: PayrollStatus;
  flags: string[]; // References to Flag IDs
}

// Batch status
export enum BatchStatus {
  PROCESSING = 'processing',
  VERIFIED = 'verified',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Payroll batch document
export interface PayrollBatch {
  batchHash: string;
  uploadedBy: string;
  csvLink: string;
  uploadedAt: Date;
  month: number;
  year: number;
  totalStaff: number;
  totalAmount: number;
  flaggedCount: number;
  payrollRecords: PayrollRecord[];
  blockchainTx?: string;
  status: BatchStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Flag types
export enum FlagType {
  DUPLICATE = 'duplicate',
  ANOMALY = 'anomaly',
  GHOST = 'ghost',
  MISSING_REGISTRY = 'missing_registry',
  SALARY_SPIKE = 'salary_spike',
  FREQUENCY_ANOMALY = 'frequency_anomaly'
}

// Flag resolution types
export enum FlagResolution {
  CONFIRMED = 'confirmed',
  FALSE_POSITIVE = 'false_positive',
  PENDING = 'pending'
}

// Flag document
export interface Flag {
  payrollId: string;
  staffHash: string;
  type: FlagType;
  score: number; // Confidence score 0-1
  reason: string;
  explanation: string;
  metadata?: Record<string, any>;
  reviewed: boolean;
  resolution?: FlagResolution;
  reviewedBy?: string;
  reviewedAt?: Date;
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// Pagination metadata
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasMore: boolean;
}

// Paginated response
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
  timestamp: string;
}

// Stellar transaction result
export interface StellarTxResult {
  transactionHash: string;
  ledger: number;
  status: 'SUCCESS' | 'FAILED';
}

// Password validation result
export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

// Validation constants
export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  PHONE_MIN_LENGTH: 10,
  PHONE_MAX_LENGTH: 15,
  BVN_LENGTH: 11,
  NIN_LENGTH: 11,
  SALARY_MIN: 0,
  SALARY_MAX: 100000000, // 100 million
  PAGINATION_MAX_LIMIT: 100,
  PAGINATION_DEFAULT_LIMIT: 10
} as const;