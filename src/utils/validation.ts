// src/utils/validation.ts
import { VALIDATION_RULES } from '../types';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Email validation
 */
export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = [];
  const trimmed = email.trim();

  if (!trimmed) {
    errors.push('Email is required');
    return { isValid: false, errors };
  }

  if (trimmed.length > 255) {
    errors.push('Email must not exceed 255 characters');
  }

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    errors.push('Please provide a valid email address');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Password validation with strength requirements
 */
export const validatePassword = (password: string): ValidationResult => {
  const errors: string[] = [];

  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  if (password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters long`);
  }

  if (password.length > VALIDATION_RULES.PASSWORD_MAX_LENGTH) {
    errors.push(`Password must not exceed ${VALIDATION_RULES.PASSWORD_MAX_LENGTH} characters`);
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Name validation (first name, last name)
 */
export const validateName = (name: string, fieldName: string = 'Name'): ValidationResult => {
  const errors: string[] = [];
  const trimmed = name?.trim() || '';

  if (!trimmed) {
    errors.push(`${fieldName} is required`);
    return { isValid: false, errors };
  }

  if (trimmed.length < VALIDATION_RULES.NAME_MIN_LENGTH) {
    errors.push(`${fieldName} must be at least ${VALIDATION_RULES.NAME_MIN_LENGTH} characters`);
  }

  if (trimmed.length > VALIDATION_RULES.NAME_MAX_LENGTH) {
    errors.push(`${fieldName} must not exceed ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`);
  }

  // Allow letters, spaces, hyphens, and apostrophes
  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
    errors.push(`${fieldName} can only contain letters, spaces, hyphens, and apostrophes`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Phone number validation
 */
export const validatePhone = (phone: string): ValidationResult => {
  const errors: string[] = [];
  const trimmed = phone?.replace(/[\s-()]/g, '') || '';

  if (!trimmed) {
    errors.push('Phone number is required');
    return { isValid: false, errors };
  }

  if (trimmed.length < VALIDATION_RULES.PHONE_MIN_LENGTH) {
    errors.push(`Phone number must be at least ${VALIDATION_RULES.PHONE_MIN_LENGTH} digits`);
  }

  if (trimmed.length > VALIDATION_RULES.PHONE_MAX_LENGTH) {
    errors.push(`Phone number must not exceed ${VALIDATION_RULES.PHONE_MAX_LENGTH} digits`);
  }

  if (!/^\+?\d+$/.test(trimmed)) {
    errors.push('Phone number can only contain digits and an optional leading +');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * BVN validation (Bank Verification Number - Nigeria)
 */
export const validateBVN = (bvn: string): ValidationResult => {
  const errors: string[] = [];
  const trimmed = bvn?.trim() || '';

  if (!trimmed) {
    errors.push('BVN is required');
    return { isValid: false, errors };
  }

  if (trimmed.length !== VALIDATION_RULES.BVN_LENGTH) {
    errors.push(`BVN must be exactly ${VALIDATION_RULES.BVN_LENGTH} digits`);
  }

  if (!/^\d+$/.test(trimmed)) {
    errors.push('BVN can only contain digits');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * NIN validation (National Identification Number - Nigeria)
 */
export const validateNIN = (nin: string): ValidationResult => {
  const errors: string[] = [];
  const trimmed = nin?.trim() || '';

  if (!trimmed) {
    errors.push('NIN is required');
    return { isValid: false, errors };
  }

  if (trimmed.length !== VALIDATION_RULES.NIN_LENGTH) {
    errors.push(`NIN must be exactly ${VALIDATION_RULES.NIN_LENGTH} digits`);
  }

  if (!/^\d+$/.test(trimmed)) {
    errors.push('NIN can only contain digits');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Salary amount validation
 */
export const validateSalary = (salary: number): ValidationResult => {
  const errors: string[] = [];

  if (salary === undefined || salary === null) {
    errors.push('Salary is required');
    return { isValid: false, errors };
  }

  if (typeof salary !== 'number' || isNaN(salary)) {
    errors.push('Salary must be a valid number');
  }

  if (salary < VALIDATION_RULES.SALARY_MIN) {
    errors.push(`Salary must be at least ${VALIDATION_RULES.SALARY_MIN}`);
  }

  if (salary > VALIDATION_RULES.SALARY_MAX) {
    errors.push(`Salary must not exceed ${VALIDATION_RULES.SALARY_MAX}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Date validation
 */
export const validateDate = (dateString: string, fieldName: string = 'Date'): ValidationResult => {
  const errors: string[] = [];

  if (!dateString) {
    errors.push(`${fieldName} is required`);
    return { isValid: false, errors };
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    errors.push(`${fieldName} must be a valid date in ISO 8601 format`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * MongoDB ObjectId validation
 */
export const validateObjectId = (id: string, fieldName: string = 'ID'): ValidationResult => {
  const errors: string[] = [];

  if (!id) {
    errors.push(`${fieldName} is required`);
    return { isValid: false, errors };
  }

  // MongoDB ObjectId is 24 character hex string
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    errors.push(`${fieldName} must be a valid MongoDB ObjectId`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Pagination parameters validation
 */
export const validatePagination = (
  page?: string | number,
  limit?: string | number
): { page: number; limit: number; errors: string[] } => {
  const errors: string[] = [];

  // Parse page
  let parsedPage = typeof page === 'string' ? parseInt(page) : (page || 1);
  if (isNaN(parsedPage) || parsedPage < 1) {
    errors.push('Page must be a positive integer');
    parsedPage = 1;
  }

  // Parse limit
  let parsedLimit = typeof limit === 'string' ? parseInt(limit) : (limit || VALIDATION_RULES.PAGINATION_DEFAULT_LIMIT);
  if (isNaN(parsedLimit) || parsedLimit < 1) {
    errors.push('Limit must be a positive integer');
    parsedLimit = VALIDATION_RULES.PAGINATION_DEFAULT_LIMIT;
  }

  if (parsedLimit > VALIDATION_RULES.PAGINATION_MAX_LIMIT) {
    errors.push(`Limit must not exceed ${VALIDATION_RULES.PAGINATION_MAX_LIMIT}`);
    parsedLimit = VALIDATION_RULES.PAGINATION_MAX_LIMIT;
  }

  return {
    page: parsedPage,
    limit: parsedLimit,
    errors
  };
};

/**
 * Sanitize string input (remove potentially dangerous characters)
 */
export const sanitizeString = (input: string): string => {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '') 
    .replace(/on\w+=/gi, '');
};

/**
 * Validate and sanitize search query
 */
export const validateSearchQuery = (query: string): ValidationResult & { sanitized: string } => {
  const errors: string[] = [];

  if (!query) {
    return {
      isValid: false,
      errors: ['Search query is required'],
      sanitized: ''
    };
  }

  const sanitized = sanitizeString(query);

  if (sanitized.length < 2) {
    errors.push('Search query must be at least 2 characters');
  }

  if (sanitized.length > 100) {
    errors.push('Search query must not exceed 100 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
};