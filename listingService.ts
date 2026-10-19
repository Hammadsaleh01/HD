import crypto from 'crypto';
import { FoodListing, DonationStatus, User, UserRole } from '@shared/types.ts';
import { listingRepository } from '../database/repositories/listingRepository.ts';
import { userRepository } from '../database/repositories/userRepository.ts';
import { auditRepository } from '../database/repositories/auditRepository.ts';
import { matchSuitableNgos } from './matching.ts';
import { notificationService } from './notificationService.ts';
import { AppError } from '../utils/errors.ts';
import { isValidStatusTransition } from '@shared/types.ts';
import { getCoordinatesForCity } from '@shared/locations.ts';

export const listingService = {
  createListing: async (donorUser: User, data: {
    foodName: string;
    foodCategory: string;
    quantity: number;
    unit?: 'meals' | 'kg' | 'packs';
    description?: string;
    preparationTime?: string;
    availableTime?: string;
    pickupDeadline: string;
    storageCondition?: 'Hot/Insulated' | 'Refrigerated' | 'Ambient';
    province?: string;
    city: string;
    area?: string;
    pickupAddress: string;
    coordinates?: { lat: number; lng: number };
    image?: string;
  }): Promise<FoodListing> => {
    // 1. Role verification: Allow verified Restaurant OR verified Donor (Phase 2.1)
    if (donorUser.role !== 'Restaurant' && donorUser.role !== 'Donor' && donorUser.role !== 'Admin') {
      throw AppError.forbidden('Only registered Restaurants or Donors can create food donation listings.');
    }

    if (donorUser.verificationStatus !== 'Verified' && donorUser.verificationStatus !== 'Approved') {
      throw AppError.forbidden(
        `Account verification required. Your account status is "${donorUser.verificationStatus}". Verification is required to publish food listings.`
      );
    }

    const selectedCity = data.city || donorUser.city;
    const selectedArea = data.area || donorUser.area || 'Central';
    const coords = data.coordinates || getCoordinatesForCity(selectedCity, selectedArea);

    const listingId = `listing-${crypto.randomUUID()}`;

    // Intelligent Multi-criteria matching with verified NGOs across Pakistan
    const allUsers = await userRepository.findAll();
    const matchedNgos = matchSuitableNgos(
      {
        coordinates: coords,
        city: selectedCity,
        area: selectedArea,
        quantity: data.quantity
      },
      allUsers,
      25
    );

    const newListing: FoodListing = {
      id: listingId,
      donorId: donorUser.id,
      donorName: donorUser.name,
      donorRole: donorUser.role,
      foodName: data.foodName.trim(),
      foodCategory: data.foodCategory.trim(),
      quantity: data.quantity,
      remainingQuantity: data.quantity,
      allocatedQuantity: 0,
      unit: data.unit || 'meals',
      description: data.description || '',
      preparationTime: data.preparationTime || 'Just prepared',
      availableTime: data.availableTime || 'Ready now',
      pickupDeadline: data.pickupDeadline,
      storageCondition: data.storageCondition || 'Hot/Insulated',
      province: data.province || donorUser.province || 'Punjab',
      city: selectedCity,
      area: selectedArea,
      pickupAddress: data.pickupAddress.trim(),
      coordinates: coords,
      image: data.image || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=60',
      status: 'Available',
      matchedNgos,
      createdAt: new Date().toISOString()
    };

    const saved = await listingRepository.create(newListing);

    // Notify matched NGOs within radius
    for (const ngo of matchedNgos) {
      await notificationService.dispatchNotification({
        userId: ngo.ngoId,
        title: `Surplus Food Alert: ${saved.city}`,
        message: `${saved.donorName} posted ${saved.quantity} ${saved.unit} of "${saved.foodName}" in ${saved.area}, ${saved.city}.`,
        type: 'DONATION_MATCH',
        metadata: { listingId: saved.id }
      });
    }

    await auditRepository.create({
      actorId: donorUser.id,
      actorName: donorUser.name,
      actorRole: donorUser.role,
      action: 'CREATE_LISTING',
      details: `Created listing "${saved.foodName}" (${saved.quantity} ${saved.unit}) in ${saved.city}. Matched ${matchedNgos.length} NGOs.`
    });

    return saved;
  },

  acceptListing: async (listingId: string, ngoUser: User): Promise<FoodListing> => {
    if (ngoUser.role !== 'NGO' && ngoUser.role !== 'Admin') {
      throw AppError.forbidden('Only verified NGOs can claim surplus food listings.');
    }
    if (ngoUser.verificationStatus !== 'Verified' && ngoUser.verificationStatus !== 'Approved') {
      throw AppError.forbidden('Your NGO must be verified to accept surplus food donations.');
    }

    const listing = await listingRepository.findById(listingId);
    if (!listing) {
      throw AppError.notFound('Food listing not found');
    }

    if (listing.status !== 'Available' && listing.status !== 'Matched') {
      throw AppError.badRequest(`This food donation cannot be claimed (current status: ${listing.status}).`);
    }

    if (listing.claimedByNgoId && listing.claimedByNgoId !== ngoUser.id) {
      throw AppError.badRequest('This food donation has already been claimed by another NGO.');
    }

    const updated = await listingRepository.update(listingId, {
      status: 'Accepted',
      claimedByNgoId: ngoUser.id,
      claimedByNgoName: ngoUser.organizationName || ngoUser.name,
      pickupStatus: 'Pending'
    });

    if (!updated) {
      throw AppError.internal('Failed to accept listing');
    }

    // Notify the donating restaurant / donor
    await notificationService.dispatchNotification({
      userId: listing.donorId,
      title: 'Donation Accepted!',
      message: `${updated.claimedByNgoName} accepted your food donation "${listing.foodName}". They will schedule pickup shortly.`,
      type: 'DONATION_ACCEPTED',
      metadata: { listingId: listing.id }
    });

    await auditRepository.create({
      actorId: ngoUser.id,
      actorName: ngoUser.name,
      actorRole: 'NGO',
      action: 'CLAIM_LISTING',
      details: `NGO ${updated.claimedByNgoName} accepted listing "${listing.foodName}" (${listing.id}).`
    });

    return updated;
  },

  schedulePickup: async (listingId: string, ngoUser: User, scheduledTime?: string): Promise<FoodListing> => {
    const listing = await listingRepository.findById(listingId);
    if (!listing) {
      throw AppError.notFound('Listing not found');
    }

    if (listing.claimedByNgoId !== ngoUser.id && ngoUser.role !== 'Admin') {
      throw AppError.forbidden('Forbidden: Only the claiming NGO can schedule pickup.');
    }

    if (!isValidStatusTransition(listing.status, 'Pickup_Scheduled')) {
      throw AppError.badRequest(`Cannot schedule pickup from current status "${listing.status}".`);
    }

    let plannedTime = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
    if (scheduledTime) {
      const parsed = new Date(scheduledTime);
      plannedTime = !isNaN(parsed.getTime()) ? parsed.toISOString() : scheduledTime;
    }

    const updated = await listingRepository.update(listingId, {
      status: 'Pickup_Scheduled',
      pickupStatus: 'Scheduled',
      pickupScheduledTime: plannedTime
    });

    if (!updated) {
      throw AppError.internal('Failed to schedule pickup');
    }

    // Notify the donor/restaurant
    await notificationService.dispatchNotification({
      userId: listing.donorId,
      title: 'Food Pickup Scheduled',
      message: `${listing.claimedByNgoName} scheduled pickup for ${new Date(plannedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. The restaurant confirms handover once the NGO collects the food.`,
      type: 'PICKUP_SCHEDULED',
      metadata: { listingId: listing.id }
    });

    return updated;
  },

  /**
   * Confirm food handover (no verification code).
   * The restaurant/donor that owns the listing (or an Admin) confirms the claiming
   * NGO has physically collected the food. The claiming NGO cannot confirm its own
   * pickup, so a collection is always acknowledged by the party handing the food over.
   */
  confirmHandover: async (listingId: string, confirmerUser: User): Promise<FoodListing> => {
    const listing = await listingRepository.findById(listingId);
    if (!listing) {
      throw AppError.notFound('Listing not found');
    }

    const isDonor = (listing.donorId || '').trim().toLowerCase() === (confirmerUser.id || '').trim().toLowerCase();
    if (!isDonor && confirmerUser.role !== 'Admin') {
      throw AppError.forbidden('Forbidden: Only the restaurant/donor that posted this food (or an Admin) can confirm the handover.');
    }

    if (listing.status === 'Collected' || listing.status === 'Picked_Up') {
      throw AppError.badRequest('This handover has already been confirmed.');
    }
    if (listing.status !== 'Pickup_Scheduled') {
      throw AppError.badRequest(`Handover can only be confirmed after the NGO has scheduled pickup (current status: "${listing.status}").`);
    }

    const now = new Date().toISOString();
    const updated = await listingRepository.update(listingId, {
      status: 'Collected',
      pickupStatus: 'Picked_Up',
      handoverConfirmedAt: now,
      handoverConfirmedBy: confirmerUser.id
    });

    if (!updated) {
      throw AppError.internal('Failed to update listing status');
    }

    // Notify NGO
    if (listing.claimedByNgoId) {
      await notificationService.dispatchNotification({
        userId: listing.claimedByNgoId,
        title: 'Food Handover Confirmed',
        message: `${listing.donorName} confirmed handover of "${listing.foodName}". It is ready for distribution to beneficiaries.`,
        type: 'PICKUP_VERIFIED',
        metadata: { listingId: listing.id }
      });
    }

    await auditRepository.create({
      actorId: confirmerUser.id,
      actorName: confirmerUser.name,
      actorRole: confirmerUser.role,
      action: 'CONFIRM_HANDOVER',
      details: `Handover confirmed for listing "${listing.foodName}". Status advanced to Collected.`
    });

    return updated;
  },

  /**
   * Handle user suspension or deletion side effects (Phase 2.9)
   * Cancels any active listings or claims belonging to this user
   */
  handleUserDeactivationSideEffects: async (userId: string, userRole: UserRole): Promise<void> => {
    const allListings = await listingRepository.findAll();

    for (const listing of allListings) {
      // 1. If suspended user was the donor: cancel any active or accepted listings
      if (listing.donorId === userId && (listing.status === 'Available' || listing.status === 'Matched' || listing.status === 'Accepted')) {
        await listingRepository.update(listing.id, {
          status: 'Cancelled',
          description: `${listing.description} [Cancelled: Donor account deactivated]`
        });

        if (listing.claimedByNgoId) {
          await notificationService.dispatchNotification({
            userId: listing.claimedByNgoId,
            title: 'Donation Cancelled',
            message: `Donation "${listing.foodName}" was cancelled because the donor account was deactivated.`
          });
        }
      }

      // 2. If suspended user was the claiming NGO: release claim back to Available
      if (listing.claimedByNgoId === userId && (listing.status === 'Accepted' || listing.status === 'Pickup_Scheduled')) {
        await listingRepository.update(listing.id, {
          status: 'Available',
          claimedByNgoId: undefined,
          claimedByNgoName: undefined,
          pickupStatus: undefined
        });

        await notificationService.dispatchNotification({
          userId: listing.donorId,
          title: 'Donation Re-opened',
          message: `Your food donation "${listing.foodName}" is back in the active pool as the previous NGO claim was released.`
        });
      }
    }
  }
};
