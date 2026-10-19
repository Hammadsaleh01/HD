import { getDb, persistDb } from '../store.ts';
import { NgoCampaign } from '@shared/types.ts';

export const campaignRepository = {
  findById: async (id: string): Promise<NgoCampaign | null> => {
    const db = getDb();
    const camp = db.campaigns.find(c => c.id === id);
    return camp || null;
  },

  findAll: async (filters?: { ngoId?: string; city?: string; status?: string }): Promise<NgoCampaign[]> => {
    const db = getDb();
    let res = db.campaigns;
    if (filters?.ngoId) {
      res = res.filter(c => c.ngoId === filters.ngoId);
    }
    if (filters?.city && filters.city !== 'All Cities' && filters.city !== 'Pakistan') {
      const clean = filters.city.toLowerCase().trim();
      res = res.filter(c => c.location.toLowerCase().includes(clean) || c.ngoCity.toLowerCase() === clean);
    }
    if (filters?.status) {
      res = res.filter(c => c.status === filters.status);
    }
    return res;
  },

  create: async (campaign: NgoCampaign): Promise<NgoCampaign> => {
    const db = getDb();
    db.campaigns.unshift(campaign);
    await persistDb();
    return campaign;
  },

  update: async (id: string, updates: Partial<NgoCampaign>): Promise<NgoCampaign | null> => {
    const db = getDb();
    const idx = db.campaigns.findIndex(c => c.id === id);
    if (idx === -1) return null;
    db.campaigns[idx] = { ...db.campaigns[idx]!, ...updates };
    await persistDb();
    return db.campaigns[idx]!;
  }
};
