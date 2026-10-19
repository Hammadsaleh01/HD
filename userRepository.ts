import { getDb, persistDb } from '../store.ts';
import { User, UserRole, VerificationStatus } from '@shared/types.ts';
import { maskCnic } from '../../utils/crypto.ts';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export const userRepository = {
  findById: async (id: string): Promise<User | null> => {
    const db = getDb();
    const user = db.users.find(u => u.id === id);
    return user || null;
  },

  findByEmail: async (email: string): Promise<User | null> => {
    const db = getDb();
    const clean = email.toLowerCase().trim();
    const user = db.users.find(u => u.email.toLowerCase() === clean);
    return user || null;
  },

  findByResetTokenHash: async (hash: string): Promise<User | null> => {
    const db = getDb();
    const now = new Date().toISOString();
    const user = db.users.find(u => 
      u.resetPasswordTokenHash === hash &&
      u.resetPasswordExpires &&
      u.resetPasswordExpires > now
    );
    return user || null;
  },

  findByCnicHash: async (cnicHash: string): Promise<User | null> => {
    const db = getDb();
    const user = db.users.find(u => u.cnicHash === cnicHash);
    return user || null;
  },

  findAll: async (filters?: {
    role?: UserRole;
    city?: string;
    verificationStatus?: VerificationStatus;
  }): Promise<User[]> => {
    const db = getDb();
    let result = db.users;
    if (filters?.role) {
      result = result.filter(u => u.role === filters.role);
    }
    if (filters?.city && filters.city !== 'All Cities') {
      const cleanCity = filters.city.toLowerCase().trim();
      result = result.filter(u => u.city.toLowerCase() === cleanCity);
    }
    if (filters?.verificationStatus) {
      result = result.filter(u => u.verificationStatus === filters.verificationStatus);
    }
    return result;
  },

  create: async (user: User): Promise<User> => {
    const db = getDb();
    db.users.push(user);
    await persistDb();
    return user;
  },

  update: async (id: string, updates: Partial<User>): Promise<User | null> => {
    const db = getDb();
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    db.users[idx] = { ...db.users[idx]!, ...updates };
    await persistDb();
    return db.users[idx]!;
  },

  delete: async (id: string): Promise<boolean> => {
    const db = getDb();
    const prevLen = db.users.length;
    db.users = db.users.filter(u => u.id !== id);
    if (db.users.length !== prevLen) {
      await persistDb();
      return true;
    }
    return false;
  },

  // Account lockout protections
  isAccountLocked: (user: User): boolean => {
    if (!user.lockoutUntil) return false;
    return new Date(user.lockoutUntil).getTime() > Date.now();
  },

  recordFailedLogin: async (user: User): Promise<{ locked: boolean; attemptsLeft: number }> => {
    const attempts = (user.failedLoginAttempts || 0) + 1;
    let lockoutUntil: string | undefined = undefined;
    let locked = false;

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      lockoutUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString();
      locked = true;
    }

    await userRepository.update(user.id, {
      failedLoginAttempts: attempts,
      lockoutUntil
    });

    return {
      locked,
      attemptsLeft: Math.max(0, MAX_FAILED_ATTEMPTS - attempts)
    };
  },

  resetFailedLogin: async (id: string): Promise<void> => {
    await userRepository.update(id, {
      failedLoginAttempts: 0,
      lockoutUntil: undefined
    });
  },

  // Sanitize user for public/API response (strips password, tokens, masks CNIC)
  sanitizeUser: (user: User): Omit<User, 'password' | 'resetPasswordTokenHash'> => {
    const { password, resetPasswordTokenHash, ...rest } = user;
    return {
      ...rest,
      cnic: maskCnic(user.cnic)
    };
  }
};
