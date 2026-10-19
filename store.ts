import fs from 'fs';
import path from 'path';
import { DatabaseSchema } from './schema.ts';
import { getInitialSeedData } from './seed.ts';
import { logger } from '../utils/logger.ts';

const DB_FILE = path.join(process.cwd(), 'plateshare_db.json');
const DB_TEMP_FILE = path.join(process.cwd(), 'plateshare_db.json.tmp');

let inMemoryDb: DatabaseSchema | null = null;
let writeQueue: Promise<void> = Promise.resolve();
let debounceTimer: NodeJS.Timeout | null = null;
const DEBOUNCE_MS = 50;

/**
 * Initialize and load database into memory once at startup
 */
export function initStore(customPath?: string): DatabaseSchema {
  const targetFile = customPath || DB_FILE;
  if (inMemoryDb) {
    return inMemoryDb;
  }

  try {
    if (!fs.existsSync(targetFile)) {
      logger.info('Database file not found. Bootstrapping with clean initial seed data...');
      const seed = getInitialSeedData();
      fs.writeFileSync(targetFile, JSON.stringify(seed, null, 2), 'utf-8');
      inMemoryDb = seed;
      return inMemoryDb;
    }

    const raw = fs.readFileSync(targetFile, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
    const defaultData = getInitialSeedData();

    // Ensure all required collections exist without overwriting modified data
    inMemoryDb = {
      platformSettings: parsed.platformSettings || defaultData.platformSettings,
      users: parsed.users || defaultData.users,
      listings: parsed.listings || defaultData.listings,
      assistanceCases: parsed.assistanceCases || defaultData.assistanceCases,
      allocations: parsed.allocations || [],
      distributions: parsed.distributions || [],
      financialDonations: parsed.financialDonations || defaultData.financialDonations,
      campaignExpenses: parsed.campaignExpenses || defaultData.campaignExpenses,
      campaigns: parsed.campaigns || defaultData.campaigns,
      beneficiaryApplications: parsed.beneficiaryApplications || [],
      complaints: parsed.complaints || [],
      auditLogs: parsed.auditLogs || defaultData.auditLogs,
      notifications: parsed.notifications || []
    };

    // One-time cleanup of legacy OTP fields left in older saved databases (existing records are kept)
    for (const l of inMemoryDb.listings as any[]) {
      delete l.pickupOtp; delete l.pickupOtpExpires; delete l.pickupOtpAttempts; delete l.pickupOtpLocked;
    }
    for (const a of inMemoryDb.allocations as any[]) {
      delete a.otpCode; delete a.otpExpires; delete a.failedOtpAttempts; delete a.isLocked; delete a.manualReason;
      if (a.verificationMethod !== undefined) {
        a.confirmedBy = a.verificationMethod === 'OTP' ? 'Beneficiary_Confirmed' : 'NGO_Confirmed';
        delete a.verificationMethod;
      }
    }
    for (const d of inMemoryDb.distributions as any[]) {
      delete d.manualReason;
      if (d.verificationMethod !== undefined) {
        d.confirmedBy = d.verificationMethod === 'OTP' ? 'Beneficiary_Confirmed' : 'NGO_Confirmed';
        delete d.verificationMethod;
      }
    }

    logger.info(`PlateShare in-memory store initialized with ${inMemoryDb.users.length} users and ${inMemoryDb.listings.length} listings.`);
    return inMemoryDb;
  } catch (err) {
    logger.error('Failed to parse database file, falling back to clean seed data', err);
    inMemoryDb = getInitialSeedData();
    return inMemoryDb;
  }
}

/**
 * Access the in-memory database reference
 */
export function getDb(): DatabaseSchema {
  if (!inMemoryDb) {
    return initStore();
  }
  return inMemoryDb;
}

/**
 * Atomic write operation: write to temporary file, then rename atomically.
 * Queued behind a promise chain to prevent race conditions.
 */
async function performAtomicWrite(): Promise<void> {
  if (!inMemoryDb) return;
  const snapshot = JSON.stringify(inMemoryDb, null, 2);

  return new Promise<void>((resolve, reject) => {
    fs.writeFile(DB_TEMP_FILE, snapshot, 'utf-8', (writeErr) => {
      if (writeErr) {
        logger.error('Failed to write temp database file', writeErr);
        return reject(writeErr);
      }
      fs.rename(DB_TEMP_FILE, DB_FILE, (renameErr) => {
        if (renameErr) {
          logger.error('Failed to rename temp database file', renameErr);
          return reject(renameErr);
        }
        resolve();
      });
    });
  });
}

interface PendingResolver {
  resolve: () => void;
  reject: (err: any) => void;
}
let pendingResolvers: PendingResolver[] = [];

/**
 * Schedule a debounced atomic persist
 */
export function persistDb(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    pendingResolvers.push({ resolve, reject });

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      const currentResolvers = pendingResolvers;
      pendingResolvers = [];

      writeQueue = writeQueue
        .then(() => performAtomicWrite())
        .then(() => {
          currentResolvers.forEach(r => r.resolve());
        })
        .catch(err => {
          logger.error('Database persist error', err);
          currentResolvers.forEach(r => r.reject(err));
        });
    }, DEBOUNCE_MS);
  });
}

/**
 * Immediate synchronous or awaiting write for tests
 */
export async function forcePersistDb(): Promise<void> {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  const currentResolvers = pendingResolvers;
  pendingResolvers = [];

  writeQueue = writeQueue
    .then(() => performAtomicWrite())
    .then(() => {
      currentResolvers.forEach(r => r.resolve());
    })
    .catch(err => {
      logger.error('Database force persist error', err);
      currentResolvers.forEach(r => r.reject(err));
      throw err;
    });

  return writeQueue;
}

/**
 * Reset in-memory database for testing
 */
export function setDbForTesting(data: DatabaseSchema): void {
  inMemoryDb = data;
}
