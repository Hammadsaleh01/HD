import { describe, it, expect } from 'vitest';
import { encryptCnic, decryptCnic, hashCnic, maskCnic, timingSafeEqual, hashToken } from '../../backend/src/utils/crypto.ts';
import { toPublicUser, User } from '../../shared/types.ts';
import { userRepository } from '../../backend/src/database/repositories/userRepository.ts';

describe('Cryptographic & Privacy Utilities', () => {
  const sampleCnic = '35201-1234567-1';

  it('performs AES-256-GCM encryption round-trip correctly', () => {
    const encrypted = encryptCnic(sampleCnic);
    expect(encrypted).toContain(':');
    expect(encrypted.split(':')).toHaveLength(3);

    const decrypted = decryptCnic(encrypted);
    // Decrypted should equal the cleaned CNIC numbers
    expect(decrypted).toBe('3520112345671');
  });

  it('produces consistent HMAC-SHA256 for privacy duplicate lookups', () => {
    const hash1 = hashCnic(sampleCnic);
    const hash2 = hashCnic('3520112345671');
    const hash3 = hashCnic('35202-9999999-9');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1.length).toBe(64);
  });

  it('masks CNIC exposing only the last 4 digits', () => {
    const masked = maskCnic('35201-1234567-1');
    expect(masked).toBe('****-*******5671');
    expect(masked).not.toContain('35201');
  });

  it('provides constant-time comparison immune to length short-circuits', () => {
    expect(timingSafeEqual('secret123', 'secret123')).toBe(true);
    expect(timingSafeEqual('secret123', 'secret456')).toBe(false);
    expect(timingSafeEqual('short', 'muchlongersomething')).toBe(false);
  });

  it('hashes password reset tokens using SHA-256', () => {
    const token = 'random-token-xyz-123';
    const hash = hashToken(token);
    expect(hash).toHaveLength(64);
    expect(hashToken(token)).toBe(hash);
  });

  it('ensures userRepository.sanitizeUser serializer never leaks unmasked CNIC or password', () => {
    const user: User = {
      id: 'usr-123',
      name: 'Ahmed Khan',
      email: 'ahmed@test.pk',
      phone: '+92 300 1234567',
      password: 'super-secret-bcrypt-hash',
      role: 'Beneficiary',
      verificationStatus: 'Pending',
      city: 'Lahore',
      area: 'Gulberg',
      address: 'Gulberg III, Lahore',
      cnic: encryptCnic('35201-1234567-1'),
      cnicHash: hashCnic('35201-1234567-1'),
      createdAt: '2026-01-01'
    };

    const sanitized = userRepository.sanitizeUser(user);
    expect((sanitized as any).password).toBeUndefined();
    expect(sanitized.cnic).toBe('****-*******5671');
    expect(sanitized.cnic).not.toContain(':'); // Not the raw encrypted payload
  });
});
