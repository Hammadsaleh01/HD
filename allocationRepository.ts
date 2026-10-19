import { getDb, persistDb } from '../store.ts';
import { FoodAllocation, FoodDistribution, BeneficiaryType } from '@shared/types.ts';
import { AppError } from '../../utils/errors.ts';

// Async mutex to guarantee atomic serial execution for allocation mutations
let allocationMutexQueue = Promise.resolve();

function withAllocationMutex<T>(fn: () => Promise<T>): Promise<T> {
  const next = allocationMutexQueue.then(fn, fn);
  allocationMutexQueue = next.then(() => {}, () => {});
  return next;
}

export const allocationRepository = {
  findById: async (id: string): Promise<FoodAllocation | null> => {
    const db = getDb();
    const alloc = db.allocations.find(a => a.id === id);
    return alloc || null;
  },

  findAll: async (filters?: {
    ngoId?: string;
    beneficiaryId?: string;
    status?: 'Active' | 'Delivered' | 'Cancelled';
  }): Promise<FoodAllocation[]> => {
    const db = getDb();
    let res = db.allocations;
    if (filters?.ngoId) {
      res = res.filter(a => a.ngoId === filters.ngoId);
    }
    if (filters?.beneficiaryId) {
      res = res.filter(a => a.beneficiaryId === filters.beneficiaryId);
    }
    if (filters?.status) {
      res = res.filter(a => a.status === filters.status);
    }
    return res;
  },

  findActiveForBeneficiaryInPeriod: async (
    beneficiaryType: BeneficiaryType,
    beneficiaryId: string,
    periodKey: string
  ): Promise<FoodAllocation[]> => {
    const db = getDb();
    return db.allocations.filter(a =>
      a.beneficiaryType === beneficiaryType &&
      a.beneficiaryId === beneficiaryId &&
      a.distributionPeriod === periodKey &&
      a.status !== 'Cancelled'
    );
  },

  /**
   * Atomic allocation creation with strict mutex lock
   */
  createAtomicAllocation: async (params: {
    allocation: FoodAllocation;
    listingId: string;
    quantity: number;
    beneficiaryType: BeneficiaryType;
    beneficiaryId: string;
    periodKey: string;
    maxMealsPerPeriod: number;
  }): Promise<FoodAllocation> => {
    return withAllocationMutex(async () => {
      const db = getDb();
      const listing = db.listings.find(l => l.id === params.listingId);
      if (!listing) {
        throw AppError.notFound('Listing not found');
      }

      if (listing.status !== 'Picked_Up' && listing.status !== 'Collected' && listing.status !== 'Distributed' && listing.pickupStatus !== 'Picked_Up') {
        throw AppError.badRequest(
          `Listing must be Collected or Picked_Up before distributing allocations. Current status is ${listing.status}.`
        );
      }

      if (listing.remainingQuantity < params.quantity) {
        throw AppError.badRequest(
          `Insufficient remaining quantity. Available: ${listing.remainingQuantity}, Requested: ${params.quantity}`
        );
      }

      // Check duplicate period allocation
      const existing = db.allocations.filter(a =>
        a.beneficiaryType === params.beneficiaryType &&
        a.beneficiaryId === params.beneficiaryId &&
        a.distributionPeriod === params.periodKey &&
        a.status !== 'Cancelled'
      );

      const currentAllocatedMeals = existing.reduce((sum, a) => sum + a.quantity, 0);
      if (currentAllocatedMeals + params.quantity > params.maxMealsPerPeriod) {
        throw AppError.conflict(
          `Allocation Limit Exceeded: This beneficiary already has ${currentAllocatedMeals} meals allocated for period ${params.periodKey} (limit: ${params.maxMealsPerPeriod}).`
        );
      }

      // Update listing quantities
      listing.remainingQuantity -= params.quantity;
      listing.allocatedQuantity += params.quantity;
      listing.status = 'Distributed';
      listing.updatedAt = new Date().toISOString();

      // Push allocation
      db.allocations.unshift(params.allocation);
      await persistDb();

      return params.allocation;
    });
  },

  update: async (id: string, updates: Partial<FoodAllocation>): Promise<FoodAllocation | null> => {
    return withAllocationMutex(async () => {
      const db = getDb();
      const idx = db.allocations.findIndex(a => a.id === id);
      if (idx === -1) return null;
      db.allocations[idx] = { ...db.allocations[idx]!, ...updates };
      await persistDb();
      return db.allocations[idx]!;
    });
  },

  /**
   * Cancel an allocation and restore remaining quantity back to the listing
   */
  cancelAllocation: async (id: string): Promise<FoodAllocation | null> => {
    return withAllocationMutex(async () => {
      const db = getDb();
      const alloc = db.allocations.find(a => a.id === id);
      if (!alloc) return null;
      if (alloc.status === 'Cancelled') return alloc;

      alloc.status = 'Cancelled';
      const listing = db.listings.find(l => l.id === alloc.donationId);
      if (listing) {
        listing.remainingQuantity += alloc.quantity;
        listing.allocatedQuantity = Math.max(0, listing.allocatedQuantity - alloc.quantity);
        if (listing.status === 'Completed' && listing.remainingQuantity > 0) {
          listing.status = 'Distributed';
        }
        listing.updatedAt = new Date().toISOString();
      }

      await persistDb();
      return alloc;
    });
  },

  // Record Distribution
  createDistribution: async (dist: FoodDistribution): Promise<FoodDistribution> => {
    const db = getDb();
    db.distributions.unshift(dist);
    await persistDb();
    return dist;
  },

  findAllDistributions: async (filters?: {
    beneficiaryId?: string;
    volunteerId?: string;
    donationId?: string;
  }): Promise<FoodDistribution[]> => {
    const db = getDb();
    let res = db.distributions;
    if (filters?.beneficiaryId) {
      res = res.filter(d => d.beneficiaryId === filters.beneficiaryId);
    }
    if (filters?.volunteerId) {
      res = res.filter(d => d.volunteerId === filters.volunteerId);
    }
    if (filters?.donationId) {
      res = res.filter(d => d.donationId === filters.donationId);
    }
    return res;
  }
};
