import crypto from 'crypto';

/**
 * Generate SHA-256 hash of input string
 */
export const sha256Hash = (input: string): string => {
  return crypto.createHash('sha256').update(input).digest('hex');
};

/**
 * Generate deterministic staff hash from staff data
 * Order matters! Don't change the concatenation order
 * 
 * Hash Generation Algorithm:
 * 1. Normalize all inputs (lowercase, trim whitespace)
 * 2. Concatenate in this exact order: name|dob|bvn|nin
 * 3. Apply SHA-256 hash
 * 
 * @param name - Staff full name
 * @param dob - Date of birth (format: YYYY-MM-DD)
 * @param bvn - Bank Verification Number
 * @param nin - National Identification Number
 * @returns SHA-256 hash (64 hex characters)
 */
export const generateStaffHash = (
  name: string,
  dob: string,
  bvn: string,
  nin: string
): string => {
  // Normalize inputs (lowercase, trim whitespace)
  const normalizedName = name.toLowerCase().trim().replace(/\s+/g, ' ');
  const normalizedDob = dob.trim();
  const normalizedBvn = bvn.trim();
  const normalizedNin = nin.trim();
  
  // Concatenate in exact order with pipe separator
  const concatenated = `${normalizedName}|${normalizedDob}|${normalizedBvn}|${normalizedNin}`;
  
  return sha256Hash(concatenated);
};

/**
 * Generate hash for a single field (for privacy)
 */
export const hashField = (field: string): string => {
  return sha256Hash(field.toLowerCase().trim());
};

/**
 * Generate batch hash from CSV content
 */
export const generateBatchHash = (csvContent: string): string => {
  return sha256Hash(csvContent);
};

/**
 * Compare two hashes securely (timing-safe)
 */
export const compareHashes = (hash1: string, hash2: string): boolean => {
  return crypto.timingSafeEqual(
    Buffer.from(hash1, 'hex'),
    Buffer.from(hash2, 'hex')
  );
};