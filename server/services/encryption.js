import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// Get encryption key from environment or use a default (for development only)
// In production, this should be set via environment variable
function getEncryptionKey() {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    // Use the environment key, ensuring it's 32 bytes
    return crypto.createHash('sha256').update(envKey).digest();
  }
  // Default key for development (NOT SECURE FOR PRODUCTION)
  // Users should set ENCRYPTION_KEY environment variable
  return crypto.createHash('sha256').update('default-dev-key-change-in-production').digest();
}

export function encrypt(text) {
  if (!text) return '';
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText) {
  if (!encryptedText) return '';
  
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');
    
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
}

export function maskKey(key) {
  if (!key || key.length < 8) {
    return '••••••••';
  }
  return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
}

