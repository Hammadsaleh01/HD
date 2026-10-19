import { getDb, persistDb } from '../store.ts';
import { AuditLog } from '@shared/types.ts';
import { sanitizeLogInput } from '../../utils/logger.ts';

export const auditRepository = {
  create: async (log: Omit<AuditLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): Promise<AuditLog> => {
    const db = getDb();
    const entry: AuditLog = {
      id: log.id || `audit-${crypto.randomUUID()}`,
      actorId: log.actorId,
      actorName: sanitizeLogInput(log.actorName) || 'System',
      actorRole: log.actorRole,
      action: log.action,
      details: sanitizeLogInput(log.details) || '',
      timestamp: log.timestamp || new Date().toISOString()
    };
    db.auditLogs.unshift(entry);
    await persistDb();
    return entry;
  },

  findAll: async (limit = 100): Promise<AuditLog[]> => {
    const db = getDb();
    return db.auditLogs.slice(0, limit);
  }
};
