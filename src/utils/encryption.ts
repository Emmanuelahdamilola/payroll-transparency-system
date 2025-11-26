import CryptoJS from 'crypto-js';
import config from '../config/env';

// Use JWT_SECRET as encryption key (in production, use a separate encryption key)
const ENCRYPTION_KEY = config.JWT_SECRET;

/**
 * Encrypt sensitive data using AES
 */
export const encrypt = (text: string): string => {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};

/**
 * Decrypt sensitive data
 */
export const decrypt = (encryptedText: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

/**
 * Encrypt multiple fields in an object
 */
export const encryptFields = (data: Record<string, string>, fields: string[]): Record<string, string> => {
  const encrypted: Record<string, string> = { ...data };
  
  fields.forEach(field => {
    if (encrypted[field]) {
      encrypted[field] = encrypt(encrypted[field]);
    }
  });
  
  return encrypted;
};

/**
 * Decrypt multiple fields in an object
 */
export const decryptFields = (data: Record<string, string>, fields: string[]): Record<string, string> => {
  const decrypted: Record<string, string> = { ...data };
  
  fields.forEach(field => {
    if (decrypted[field]) {
      try {
        decrypted[field] = decrypt(decrypted[field]);
      } catch (error) {
        console.error(`Failed to decrypt field: ${field}`);
      }
    }
  });
  
  return decrypted;
};