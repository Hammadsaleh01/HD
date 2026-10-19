import { getDb, persistDb } from '../store.ts';
import { Complaint } from '@shared/types.ts';

export const complaintRepository = {
  findById: async (id: string): Promise<Complaint | null> => {
    const db = getDb();
    const c = db.complaints.find(item => item.id === id);
    return c || null;
  },

  findAll: async (filters?: { reporterId?: string; city?: string; status?: string }): Promise<Complaint[]> => {
    const db = getDb();
    let res = db.complaints;
    if (filters?.reporterId) {
      res = res.filter(c => c.reporterId === filters.reporterId);
    }
    if (filters?.city && filters.city !== 'All Cities') {
      const clean = filters.city.toLowerCase().trim();
      res = res.filter(c => c.city?.toLowerCase() === clean);
    }
    if (filters?.status) {
      res = res.filter(c => c.status === filters.status);
    }
    return res;
  },

  create: async (comp: Complaint): Promise<Complaint> => {
    const db = getDb();
    db.complaints.unshift(comp);
    await persistDb();
    return comp;
  },

  update: async (id: string, updates: Partial<Complaint>): Promise<Complaint | null> => {
    const db = getDb();
    const idx = db.complaints.findIndex(c => c.id === id);
    if (idx === -1) return null;
    db.complaints[idx] = { ...db.complaints[idx]!, ...updates };
    await persistDb();
    return db.complaints[idx]!;
  }
};
