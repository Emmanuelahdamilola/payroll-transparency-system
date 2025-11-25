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
 */
export const generateStaffHash = (
  name: string,
  dob: string,
  bvn: string,
  nin: string
): string => {
  // Normalize inputs (lowercase, trim whitespace)
  const normalized = [
    name.toLowerCase().trim(),
    dob.trim(),
    bvn.trim(),
    nin.trim()
  ].join('|');

  return sha256Hash(normalized);
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