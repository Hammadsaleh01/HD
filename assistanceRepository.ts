import { getDb, persistDb } from '../store.ts';
import { AssistanceCase, BeneficiaryApplication } from '@shared/types.ts';
import { maskCnic } from '../../utils/crypto.ts';

export const assistanceRepository = {
  // --- ASSISTANCE CASES (OFFLINE BENEFICIARIES) ---
  findCaseById: async (id: string): Promise<AssistanceCase | null> => {
    const db = getDb();
    const item = db.assistanceCases.find(c => c.id === id);
    return item || null;
  },

  findCaseByCnicHash: async (cnicHash: string): Promise<AssistanceCase | null> => {
    const db = getDb();
    const item = db.assistanceCases.find(c => c.cnicHash === cnicHash);
    return item || null;
  },

  findAllCases: async (filters?: { ngoId?: string; city?: string }): Promise<AssistanceCase[]> => {
    const db = getDb();
    let res = db.assistanceCases;
    if (filters?.ngoId) {
      res = res.filter(c => c.registeredByNgoId === filters.ngoId);
    }
    if (filters?.city && filters.city !== 'All Cities') {
      const clean = filters.city.toLowerCase().trim();
      res = res.filter(c => c.city.toLowerCase() === clean);
    }
    return res;
  },

  createCase: async (caseData: AssistanceCase): Promise<AssistanceCase> => {
    const db = getDb();
    db.assistanceCases.push(caseData);
    await persistDb();
    return caseData;
  },

  deleteCase: async (id: string): Promise<boolean> => {
    const db = getDb();
    const prev = db.assistanceCases.length;
    db.assistanceCases = db.assistanceCases.filter(c => c.id !== id);
    if (db.assistanceCases.length !== prev) {
      await persistDb();
      return true;
    }
    return false;
  },

  // --- BENEFICIARY APPLICATIONS ---
  findApplicationById: async (id: string): Promise<BeneficiaryApplication | null> => {
    const db = getDb();
    const app = db.beneficiaryApplications.find(a => a.id === id);
    return app || null;
  },

  findApplicationsByApplicantId: async (applicantId: string): Promise<BeneficiaryApplication[]> => {
    const db = getDb();
    return db.beneficiaryApplications.filter(a => a.applicantId === applicantId);
  },

  findApplicationByCnicHash: async (cnicHash: string): Promise<BeneficiaryApplication | null> => {
    const db = getDb();
    const app = db.beneficiaryApplications.find(a => a.cnicHash === cnicHash);
    return app || null;
  },

  findAllApplications: async (filters?: { city?: string; status?: string }): Promise<BeneficiaryApplication[]> => {
    const db = getDb();
    let res = db.beneficiaryApplications;
    if (filters?.city && filters.city !== 'All Cities') {
      const clean = filters.city.toLowerCase().trim();
      res = res.filter(a => a.city.toLowerCase() === clean);
    }
    if (filters?.status) {
      res = res.filter(a => a.status === filters.status);
    }
    return res;
  },

  createApplication: async (app: BeneficiaryApplication): Promise<BeneficiaryApplication> => {
    const db = getDb();
    db.beneficiaryApplications.unshift(app);
    await persistDb();
    return app;
  },

  updateApplication: async (id: string, updates: Partial<BeneficiaryApplication>): Promise<BeneficiaryApplication | null> => {
    const db = getDb();
    const idx = db.beneficiaryApplications.findIndex(a => a.id === id);
    if (idx === -1) return null;
    db.beneficiaryApplications[idx] = { ...db.beneficiaryApplications[idx]!, ...updates };
    await persistDb();
    return db.beneficiaryApplications[idx]!;
  },

  sanitizeCase: (c: AssistanceCase): AssistanceCase => {
    return {
      ...c,
      cnic: maskCnic(c.cnic)
    };
  },

  sanitizeApplication: (a: BeneficiaryApplication): BeneficiaryApplication => {
    return {
      ...a,
      cnic: maskCnic(a.cnic)
    };
  }
};
