import crypto from 'crypto';

// Get or derive a 32-byte key for AES-256-GCM encryption
function getEncryptionKey(): Buffer {
  const envKey = process.env.CNIC_ENCRYPTION_KEY;
  if (envKey) {
    if (envKey.length === 64) {
      return Buffer.from(envKey, 'hex');
    }
    return crypto.createHash('sha256').update(envKey).digest();
  }
  // In development, provide a stable deterministic key if not supplied
  const devSeed = 'plateshare-development-cnic-encryption-key-seed-2026';
  return crypto.createHash('sha256').update(devSeed).digest();
}

const HMAC_SECRET = process.env.CNIC_HMAC_SECRET || 'plateshare-cnic-hmac-salt-2026';

/**
 * Encrypt a CNIC string using AES-256-GCM with a random IV
 * Format: iv:authTag:ciphertext (hex)
 */
export function encryptCnic(plainCnic: string): string {
  if (!plainCnic) return '';
  const clean = plainCnic.replace(/[-\s]/g, '').trim();
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(clean, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

/**
 * Decrypt a CNIC string from AES-256-GCM
 */
export function decryptCnic(encryptedPayload: string): string {
  if (!encryptedPayload) return '';
  // Check if it's already masked or plaintext fallback
  if (!encryptedPayload.includes(':')) {
    return encryptedPayload;
  }
  try {
    const [ivHex, tagHex, contentHex] = encryptedPayload.split(':');
    if (!ivHex || !tagHex || !contentHex) return encryptedPayload;
    
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    
    let decrypted = decipher.update(contentHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return '0000000000000';
  }
}

/**
 * Generate HMAC-SHA256 hash of cleaned CNIC for privacy-preserving duplicate lookups
 */
export function hashCnic(plainCnic: string): string {
  if (!plainCnic) return '';
  const clean = plainCnic.replace(/[-\s]/g, '').trim();
  return crypto.createHmac('sha256', HMAC_SECRET).update(clean).digest('hex');
}

/**
 * Generate SHA-256 hash for password reset tokens
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Constant-time string comparison to eliminate timing attacks
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a.trim());
  const bBuf = Buffer.from(b.trim());
  if (aBuf.length !== bBuf.length) {
    // Prevent short-circuit timing leak on length difference
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Mask CNIC to display only the last 4 digits (e.g. ****-*******1234)
 * Handles encrypted or plaintext inputs
 */
export function maskCnic(cnic?: string): string {
  if (!cnic) return 'Verified ID';
  let plain = cnic;
  if (cnic.includes(':')) {
    plain = decryptCnic(cnic);
  }
  const clean = plain.replace(/[-\s]/g, '').trim();
  if (clean.length < 4) return '****-*******';
  const lastFour = clean.slice(-4);
  return `****-*******${lastFour}`;
}
