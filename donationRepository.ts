import { getDb, persistDb } from '../store.ts';
import { FinancialDonation, CampaignExpense } from '@shared/types.ts';

// Mutex for atomic financial donation processing
let donationMutex = Promise.resolve();

function withDonationMutex<T>(fn: () => Promise<T>): Promise<T> {
  const next = donationMutex.then(fn, fn);
  donationMutex = next.then(() => {}, () => {});
  return next;
}

export const donationRepository = {
  createDonation: async (donation: FinancialDonation): Promise<FinancialDonation> => {
    return withDonationMutex(async () => {
      const db = getDb();
      db.financialDonations.unshift(donation);

      // If associated with a campaign and successful, atomically increment raised amount
      if (donation.campaignId && donation.status === 'Successful') {
        const campaign = db.campaigns.find(c => c.id === donation.campaignId);
        if (campaign) {
          campaign.raisedAmountPkr += donation.amountPkr;
        }
      }

      await persistDb();
      return donation;
    });
  },

  findById: async (id: string): Promise<FinancialDonation | null> => {
    const db = getDb();
    const don = db.financialDonations.find(d => d.id === id);
    return don || null;
  },

  findAllDonations: async (filters?: {
    donorId?: string;
    ngoId?: string;
    campaignId?: string;
    status?: string;
  }): Promise<FinancialDonation[]> => {
    const db = getDb();
    let res = db.financialDonations;
    if (filters?.donorId) {
      res = res.filter(d => d.donorId === filters.donorId);
    }
    if (filters?.ngoId) {
      res = res.filter(d => d.ngoId === filters.ngoId);
    }
    if (filters?.campaignId) {
      res = res.filter(d => d.campaignId === filters.campaignId);
    }
    if (filters?.status) {
      res = res.filter(d => d.status === filters.status);
    }
    return res;
  },

  updateDonation: async (id: string, updates: Partial<FinancialDonation>): Promise<FinancialDonation | null> => {
    return withDonationMutex(async () => {
      const db = getDb();
      const idx = db.financialDonations.findIndex(d => d.id === id);
      if (idx === -1) return null;
      const prev = db.financialDonations[idx]!;
      const wasSuccessful = prev.status === 'Successful' || prev.status === 'Completed';
      const isNowSuccessful = updates.status === 'Successful' || updates.status === 'Completed';

      // If transitioning to completed/successful and was not before, increment campaign raised amount
      if (!wasSuccessful && isNowSuccessful && prev.campaignId) {
        const campaign = db.campaigns.find(c => c.id === prev.campaignId);
        if (campaign) {
          campaign.raisedAmountPkr += prev.amountPkr;
        }
      }

      db.financialDonations[idx] = { ...prev, ...updates };
      await persistDb();
      return db.financialDonations[idx]!;
    });
  },

  createExpense: async (exp: CampaignExpense): Promise<CampaignExpense> => {
    const db = getDb();
    db.campaignExpenses.unshift(exp);
    await persistDb();
    return exp;
  },

  findExpenses: async (filters?: { ngoId?: string; campaignId?: string }): Promise<CampaignExpense[]> => {
    const db = getDb();
    let res = db.campaignExpenses;
    if (filters?.ngoId) {
      res = res.filter(e => e.ngoId === filters.ngoId);
    }
    if (filters?.campaignId) {
      res = res.filter(e => e.campaignId === filters.campaignId);
    }
    return res;
  }
};
