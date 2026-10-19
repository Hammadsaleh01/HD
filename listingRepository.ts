import { getDb, persistDb } from '../store.ts';
import { FoodListing, DonationStatus, toPublicListing, PublicFoodListing } from '@shared/types.ts';

export const listingRepository = {
  findById: async (id: string): Promise<FoodListing | null> => {
    await listingRepository.checkAndExpireListings();
    const db = getDb();
    const listing = db.listings.find(l => l.id === id);
    return listing || null;
  },

  findAll: async (filters?: {
    city?: string;
    province?: string;
    status?: DonationStatus;
  }): Promise<FoodListing[]> => {
    await listingRepository.checkAndExpireListings();
    const db = getDb();
    let result = db.listings;

    if (filters?.city && filters.city !== 'All Cities' && filters.city !== 'Pakistan') {
      const cleanCity = filters.city.toLowerCase().trim();
      result = result.filter(l => l.city && l.city.toLowerCase().trim() === cleanCity);
    }
    if (filters?.province && filters.province !== 'All Provinces') {
      const cleanProv = filters.province.toLowerCase().trim();
      result = result.filter(l => l.province && l.province.toLowerCase().trim() === cleanProv);
    }
    if (filters?.status) {
      result = result.filter(l => l.status === filters.status);
    }
    return result;
  },

  findDonorListings: async (donorId: string): Promise<FoodListing[]> => {
    await listingRepository.checkAndExpireListings();
    const db = getDb();
    const target = (donorId || '').trim().toLowerCase();
    return db.listings.filter(l => l.donorId && l.donorId.trim().toLowerCase() === target);
  },

  findClaimedByNgo: async (ngoId: string, ngoName?: string): Promise<FoodListing[]> => {
    await listingRepository.checkAndExpireListings();
    const db = getDb();
    const target = (ngoId || '').trim().toLowerCase();
    const targetName = (ngoName || '').trim().toLowerCase();
    return db.listings.filter(l => {
      if (!l.claimedByNgoId && !l.claimedByNgoName) return false;
      const claimedId = (l.claimedByNgoId || '').trim().toLowerCase();
      const claimedName = (l.claimedByNgoName || '').trim().toLowerCase();
      return (
        (claimedId && claimedId === target) ||
        (targetName && claimedName && claimedName === targetName)
      );
    });
  },

  create: async (listing: FoodListing): Promise<FoodListing> => {
    const db = getDb();
    db.listings.unshift(listing);
    await persistDb();
    return listing;
  },

  update: async (id: string, updates: Partial<FoodListing>): Promise<FoodListing | null> => {
    const db = getDb();
    const idx = db.listings.findIndex(l => l.id === id);
    if (idx === -1) return null;
    db.listings[idx] = {
      ...db.listings[idx]!,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await persistDb();
    return db.listings[idx]!;
  },

  delete: async (id: string): Promise<boolean> => {
    const db = getDb();
    const prev = db.listings.length;
    db.listings = db.listings.filter(l => l.id !== id);
    if (db.listings.length !== prev) {
      await persistDb();
      return true;
    }
    return false;
  },

  /**
   * Automatically check and expire active listings whose pickupDeadline is in the past
   */
  checkAndExpireListings: async (): Promise<number> => {
    const db = getDb();
    const now = Date.now();
    let expiredCount = 0;

    for (const listing of db.listings) {
      if (listing.status === 'Available' || listing.status === 'Matched') {
        const deadlineMs = new Date(listing.pickupDeadline).getTime();
        if (!isNaN(deadlineMs) && deadlineMs < now) {
          listing.status = 'Expired';
          listing.updatedAt = new Date().toISOString();
          expiredCount++;
        }
      }
    }

    if (expiredCount > 0) {
      await persistDb();
    }
    return expiredCount;
  },

  toPublic: (listing: FoodListing): PublicFoodListing => {
    return toPublicListing(listing);
  }
};
