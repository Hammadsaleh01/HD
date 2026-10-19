import crypto from 'crypto';
import { 
  FoodAllocation, 
  FoodDistribution, 
  User, 
  BeneficiaryType,
  HandoverConfirmation
} from '@shared/types.ts';
import { allocationRepository } from '../database/repositories/allocationRepository.ts';
import { listingRepository } from '../database/repositories/listingRepository.ts';
import { userRepository } from '../database/repositories/userRepository.ts';
import { assistanceRepository } from '../database/repositories/assistanceRepository.ts';
import { settingsRepository } from '../database/repositories/settingsRepository.ts';
import { auditRepository } from '../database/repositories/auditRepository.ts';
import { notificationService } from './notificationService.ts';
import { maskCnic } from '../utils/crypto.ts';
import { AppError } from '../utils/errors.ts';

export function getIsoWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function getDistributionPeriodKey(mode: 'Daily' | 'Weekly', date = new Date()): string {
  if (mode === 'Weekly') {
    return getIsoWeekString(date);
  }
  return date.toISOString().split('T')[0]!;
}

export const allocationService = {
  createAllocation: async (ngoUser: User, data: {
    listingId: string;
    beneficiaryType: BeneficiaryType;
    beneficiaryId: string;
    quantity: number;
  }): Promise<FoodAllocation> => {
    if (ngoUser.role !== 'NGO' && ngoUser.role !== 'Admin') {
      throw AppError.forbidden('Only verified NGOs or Admins can allocate meals.');
    }
    if (ngoUser.verificationStatus !== 'Verified' && ngoUser.verificationStatus !== 'Approved') {
      throw AppError.forbidden('Your NGO must be verified to allocate meals.');
    }

    const listing = await listingRepository.findById(data.listingId);
    if (!listing) {
      throw AppError.notFound('Food listing not found');
    }

    const ngoId = (ngoUser.id || '').trim().toLowerCase();
    const ngoOrg = ((ngoUser as any).organizationName || ngoUser.name || '').trim().toLowerCase();
    const claimedId = (listing.claimedByNgoId || '').trim().toLowerCase();
    const claimedOrg = (listing.claimedByNgoName || '').trim().toLowerCase();
    const isOwnerNgo = (claimedId && claimedId === ngoId) || (claimedOrg && ngoOrg && claimedOrg === ngoOrg);

    if (!isOwnerNgo && ngoUser.role !== 'Admin') {
      throw AppError.forbidden('Forbidden: You can only allocate surplus food collected by your NGO.');
    }

    // Must be Picked_Up, Collected, or Distributed
    if (listing.status !== 'Picked_Up' && listing.status !== 'Collected' && listing.status !== 'Distributed' && listing.pickupStatus !== 'Picked_Up') {
      throw AppError.badRequest(
        `Food listing must be in Collected or Picked_Up status before creating meal allocations. Current status: ${listing.status}.`
      );
    }

    // Load Beneficiary and verify eligibility
    let benName = '';
    let benCity = '';
    let isVerified = false;
    let benCnicHash: string | undefined = undefined;

    if (data.beneficiaryType === 'User') {
      const benUser = await userRepository.findById(data.beneficiaryId);
      if (!benUser || benUser.role !== 'Beneficiary') {
        throw AppError.notFound('Beneficiary user account not found');
      }
      isVerified = benUser.verificationStatus === 'Verified' || benUser.verificationStatus === 'Approved' || benUser.eligibilityStatus === 'Verified' || (benUser.eligibilityStatus as string) === 'Approved';
      benName = benUser.name;
      benCity = benUser.city;
      benCnicHash = benUser.cnicHash;
    } else {
      const benCase = await assistanceRepository.findCaseById(data.beneficiaryId);
      if (!benCase) {
        throw AppError.notFound('Assistance beneficiary record not found');
      }
      isVerified = benCase.eligibilityStatus === 'Verified' || (benCase.eligibilityStatus as string) === 'Approved' || !benCase.eligibilityStatus;
      benName = benCase.name;
      benCity = benCase.city;
      benCnicHash = benCase.cnicHash;
    }

    // BLOCK ALLOCATIONS TO NON-VERIFIED BENEFICIARIES (PHASE 1.3)
    if (!isVerified) {
      throw AppError.forbidden(
        'Beneficiary Eligibility Required: This individual is not yet verified. Only approved beneficiaries can receive meal allocations.'
      );
    }

    // Platform settings & period calculation
    const settings = await settingsRepository.getSettings();
    const periodKey = getDistributionPeriodKey(settings.distributionPeriodMode);

    // Cross-identity duplicate check by CNIC hash (Phase 2.8)
    if (benCnicHash) {
      // Find other accounts sharing this CNIC hash
      const otherUser = await userRepository.findByCnicHash(benCnicHash);
      if (otherUser && (data.beneficiaryType !== 'User' || otherUser.id !== data.beneficiaryId)) {
        const otherAllocations = await allocationRepository.findActiveForBeneficiaryInPeriod('User', otherUser.id, periodKey);
        const mealsOther = otherAllocations.reduce((s, a) => s + a.quantity, 0);
        if (mealsOther + data.quantity > settings.maxMealsPerPeriodPerBeneficiary) {
          throw AppError.conflict(
            `Duplicate Assistance Limit: This individual has already received ${mealsOther} meals in period ${periodKey} via digital account (limit: ${settings.maxMealsPerPeriodPerBeneficiary}).`
          );
        }
      }
    }

    const allocationId = `alloc-${crypto.randomUUID()}`;
    const newAlloc: FoodAllocation = {
      id: allocationId,
      donationId: listing.id,
      foodName: listing.foodName,
      ngoId: ngoUser.id,
      ngoName: ngoUser.organizationName || ngoUser.name,
      beneficiaryType: data.beneficiaryType,
      beneficiaryId: data.beneficiaryId,
      beneficiaryName: benName,
      quantity: data.quantity,
      city: benCity || listing.city,
      distributionPeriod: periodKey,
      status: 'Active',
      createdAt: new Date().toISOString()
    };

    // Atomic creation via Mutex
    const saved = await allocationRepository.createAtomicAllocation({
      allocation: newAlloc,
      listingId: listing.id,
      quantity: data.quantity,
      beneficiaryType: data.beneficiaryType,
      beneficiaryId: data.beneficiaryId,
      periodKey,
      maxMealsPerPeriod: settings.maxMealsPerPeriodPerBeneficiary
    });

    // Notify digital beneficiary if applicable
    if (data.beneficiaryType === 'User') {
      await notificationService.dispatchNotification({
        userId: data.beneficiaryId,
        title: 'Food Allocation Ready! 🍱',
        message: `${saved.ngoName} has prepared ${saved.quantity} meals of "${saved.foodName}" for you. Please collect it from them and confirm receipt in your dashboard.`,
        type: 'MEAL_ALLOCATED',
        metadata: { allocationId: saved.id }
      });
    }

    await auditRepository.create({
      actorId: ngoUser.id,
      actorName: ngoUser.name,
      actorRole: 'NGO',
      action: 'CREATE_MEAL_ALLOCATION',
      details: `Allocated ${saved.quantity} meals of "${saved.foodName}" to ${saved.beneficiaryName} for period ${saved.distributionPeriod}.`
    });

    return saved;
  },

  /**
   * Confirm Allocation Receipt (no verification code):
   * Allowed callers: (a) the allocated beneficiary (digital account), (b) the NGO that
   * created the allocation, (c) Admin. Anyone else is rejected.
   * - Listing completion: when remainingQuantity === 0 AND all allocations are Delivered -> listing Completed
   */
  confirmAllocationReceipt: async (callerUser: User, data: {
    allocationId: string;
    notes?: string;
  }): Promise<{ allocation: FoodAllocation; distribution: FoodDistribution }> => {
    const alloc = await allocationRepository.findById(data.allocationId);
    if (!alloc) {
      throw AppError.notFound('Allocation record not found');
    }

    if (alloc.status === 'Delivered') {
      throw AppError.badRequest('This allocation has already been confirmed and delivered.');
    }
    if (alloc.status === 'Cancelled') {
      throw AppError.badRequest('This allocation has been cancelled.');
    }

    const isBeneficiaryCaller = callerUser.id === alloc.beneficiaryId && alloc.beneficiaryType === 'User';
    const isOwningNgo = callerUser.id === alloc.ngoId;
    const isAdmin = callerUser.role === 'Admin';

    if (!isBeneficiaryCaller && !isOwningNgo && !isAdmin) {
      throw AppError.forbidden('Forbidden: You are not authorized to confirm this meal allocation.');
    }

    const confirmedBy: HandoverConfirmation = isBeneficiaryCaller ? 'Beneficiary_Confirmed' : 'NGO_Confirmed';

    // Update allocation to Delivered
    const updatedAlloc = await allocationRepository.update(alloc.id, {
      status: 'Delivered',
      deliveredAt: new Date().toISOString(),
      confirmedBy,
      staffMember: callerUser.name
    });

    if (!updatedAlloc) {
      throw AppError.internal('Failed to update allocation status');
    }

    // Create distribution record (Permanent audit history)
    const distId = `dist-${crypto.randomUUID()}`;
    const distRecord: FoodDistribution = {
      id: distId,
      allocationId: alloc.id,
      donationId: alloc.donationId,
      foodName: alloc.foodName,
      beneficiaryType: alloc.beneficiaryType,
      beneficiaryId: alloc.beneficiaryId,
      beneficiaryName: alloc.beneficiaryName,
      volunteerId: alloc.ngoId,
      volunteerName: alloc.ngoName,
      quantity: alloc.quantity,
      city: alloc.city,
      distributionPeriod: alloc.distributionPeriod,
      confirmedBy,
      timestamp: new Date().toISOString(),
      notes: data.notes?.trim() || `Receipt confirmed by ${isBeneficiaryCaller ? 'beneficiary' : 'distributing NGO'}`
    };

    const savedDist = await allocationRepository.createDistribution(distRecord);

    // Listing completion check (Phase 2.3):
    // When remainingQuantity reaches 0 AND all allocations are Delivered -> set status Completed
    const listing = await listingRepository.findById(alloc.donationId);
    if (listing) {
      const allAllocationsForListing = await allocationRepository.findAll();
      const listingAllocs = allAllocationsForListing.filter(a => a.donationId === listing.id);
      const allDelivered = listingAllocs.length > 0 && listingAllocs.every(a => a.status === 'Delivered' || a.status === 'Cancelled');
      
      if (listing.remainingQuantity === 0 && allDelivered) {
        await listingRepository.update(listing.id, {
          status: 'Completed'
        });
      }
    }

    await auditRepository.create({
      actorId: callerUser.id,
      actorName: callerUser.name,
      actorRole: callerUser.role,
      action: 'DELIVER_MEAL_ALLOCATION',
      details: `Delivered ${alloc.quantity} meals of "${alloc.foodName}" to ${alloc.beneficiaryName} (confirmed by ${isBeneficiaryCaller ? 'beneficiary' : callerUser.role}).`
    });

    return {
      allocation: updatedAlloc,
      distribution: savedDist
    };
  },

  cancelAllocation: async (allocationId: string, callerUser: User): Promise<FoodAllocation> => {
    const alloc = await allocationRepository.findById(allocationId);
    if (!alloc) {
      throw AppError.notFound('Allocation not found');
    }

    if (alloc.ngoId !== callerUser.id && callerUser.role !== 'Admin') {
      throw AppError.forbidden('Only the allocating NGO or Admin can cancel this allocation.');
    }

    if (alloc.status === 'Delivered') {
      throw AppError.badRequest('Cannot cancel an allocation that has already been delivered.');
    }

    const cancelled = await allocationRepository.cancelAllocation(allocationId);
    if (!cancelled) {
      throw AppError.internal('Failed to cancel allocation');
    }

    await auditRepository.create({
      actorId: callerUser.id,
      actorName: callerUser.name,
      actorRole: callerUser.role,
      action: 'CANCEL_ALLOCATION',
      details: `Cancelled allocation ${alloc.id}. Restored ${alloc.quantity} meals to listing.`
    });

    return cancelled;
  }
};
