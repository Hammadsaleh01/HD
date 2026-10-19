import { Request, Response } from 'express';
import { listingService } from '../services/listingService.ts';
import { listingRepository } from '../database/repositories/listingRepository.ts';
import { userRepository } from '../database/repositories/userRepository.ts';
import { auditRepository } from '../database/repositories/auditRepository.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';
import { AppError } from '../utils/errors.ts';
import { isValidStatusTransition, FoodListing } from '@shared/types.ts';

export const listingController = {
  // --- PUBLIC: GET ALL FOOD LISTINGS ---
  getAllListings: async (req: Request, res: Response) => {
    const { city, province, status, page = 1, limit = 50 } = req.query as any;
    const listings = await listingRepository.findAll({
      city,
      province,
      status
    });

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 50;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = listings.slice(startIndex, startIndex + limitNum).map(listingRepository.toPublic);

    res.status(200).json({
      total: listings.length,
      page: pageNum,
      limit: limitNum,
      listings: paginated
    });
  },

  // --- PUBLIC: GET LISTING BY ID ---
  getListingById: async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const listing = await listingRepository.findById(id);
    if (!listing) {
      throw AppError.notFound('Listing not found');
    }

    res.status(200).json({
      listing: listingRepository.toPublic(listing)
    });
  },

  // --- AUTHENTICATED: GET MY LISTINGS (DONOR / NGO / ADMIN FULL VIEW) ---
  getMyListings: async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    let listings = [];

    if (user.role === 'NGO' || user.role?.toUpperCase() === 'NGO') {
      listings = await listingRepository.findClaimedByNgo(
        user.id,
        (user as any).organizationName || user.name
      );
    } else if (user.role === 'Admin') {
      listings = await listingRepository.findAll();
    } else {
      listings = await listingRepository.findDonorListings(user.id);
    }

    res.status(200).json({ listings });
  },

  // --- AUTHENTICATED: GET HANDOVER STATUS (DONOR, CLAIMING NGO, ADMIN ONLY) ---
  getHandoverDetails: async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const listing = await listingRepository.findById(id);
    if (!listing) {
      throw AppError.notFound('Listing not found');
    }

    const userId = (req.user!.id || '').trim().toLowerCase();
    const userOrg = ((req.user as any)?.organizationName || req.user?.name || '').trim().toLowerCase();
    const isDonor = (listing.donorId || '').trim().toLowerCase() === userId;
    const isClaimingNgo = (listing.claimedByNgoId || '').trim().toLowerCase() === userId ||
      (listing.claimedByNgoName && listing.claimedByNgoName.trim().toLowerCase() === userOrg);
    const isAdmin = req.user!.role === 'Admin';

    if (!isDonor && !isClaimingNgo && !isAdmin) {
      throw AppError.forbidden('Forbidden: You are not authorized to view handover details for this listing.');
    }

    res.status(200).json({
      listingId: listing.id,
      status: listing.status,
      pickupStatus: listing.pickupStatus,
      pickupScheduledTime: listing.pickupScheduledTime,
      handoverConfirmedAt: listing.handoverConfirmedAt,
      claimedByNgoName: listing.claimedByNgoName,
      donorName: listing.donorName
    });
  },

  // --- CREATE DONATION (VERIFIED RESTAURANT OR DONOR) ---
  createListing: async (req: AuthenticatedRequest, res: Response) => {
    const user = await userRepository.findById(req.user!.id);
    if (!user) {
      throw AppError.notFound('User profile not found');
    }

    const created = await listingService.createListing(user, req.body);
    res.status(201).json({
      message: 'Surplus food donation listed successfully! Nearby verified NGOs have been alerted.',
      listing: created
    });
  },

  // --- NGO: ACCEPT SURPLUS FOOD ---
  acceptListing: async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const user = await userRepository.findById(req.user!.id);
    if (!user) {
      throw AppError.notFound('User profile not found');
    }

    const updated = await listingService.acceptListing(id, user);
    res.status(200).json({
      message: 'Donation accepted! Please schedule pickup time.',
      listing: updated
    });
  },

  // --- NGO: SCHEDULE PICKUP ---
  schedulePickup: async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const user = await userRepository.findById(req.user!.id);
    if (!user) {
      throw AppError.notFound('User profile not found');
    }

    const listing = await listingService.schedulePickup(id, user, req.body.scheduledTime);
    res.status(200).json({
      message: 'Pickup scheduled successfully! The restaurant will confirm the handover once you collect the food.',
      listing
    });
  },

  // --- RESTAURANT / DONOR / ADMIN: CONFIRM HANDOVER ---
  confirmHandover: async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const user = await userRepository.findById(req.user!.id);
    if (!user) {
      throw AppError.notFound('User profile not found');
    }

    const updated = await listingService.confirmHandover(id, user);
    res.status(200).json({
      message: 'Handover confirmed! Food status updated to Collected.',
      listing: updated
    });
  },

  // --- EDIT LISTING ---
  editListing: async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const listing = await listingRepository.findById(id);
    if (!listing) {
      throw AppError.notFound('Listing not found');
    }

    if (listing.donorId !== req.user!.id && req.user!.role !== 'Admin') {
      throw AppError.forbidden('Forbidden: You can only edit your own listings');
    }

    const updated = await listingRepository.update(id, req.body);
    res.status(200).json({
      message: 'Listing updated successfully',
      listing: updated
    });
  },

  // --- DELETE LISTING ---
  deleteListing: async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const listing = await listingRepository.findById(id);
    if (!listing) {
      throw AppError.notFound('Listing not found');
    }

    if (listing.donorId !== req.user!.id && req.user!.role !== 'Admin') {
      throw AppError.forbidden('Forbidden: You can only delete your own listings');
    }

    await listingRepository.delete(id);
    res.status(200).json({ message: 'Listing deleted successfully' });
  },

  // --- UPDATE LISTING STATUS (WITH TRANSITION TABLE VALIDATION) ---
  updateStatus: async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const { status } = req.body;

    const listing = await listingRepository.findById(id);
    if (!listing) {
      throw AppError.notFound('Listing not found');
    }

    const isDonor = listing.donorId === req.user!.id;
    const isClaimingNgo = listing.claimedByNgoId === req.user!.id;
    const isAdmin = req.user!.role === 'Admin';

    if (!isDonor && !isClaimingNgo && !isAdmin) {
      throw AppError.forbidden('Forbidden: You do not have permission to update this listing status.');
    }

    // Handover must be acknowledged by the restaurant/donor (or admin), never by the claiming NGO alone
    if ((status === 'Picked_Up' || status === 'Collected') && !isDonor && !isAdmin) {
      throw AppError.forbidden('Forbidden: Only the restaurant/donor or an Admin can confirm that food was handed over.');
    }

    // Check transition validity
    if (!isValidStatusTransition(listing.status, status)) {
      throw AppError.badRequest(
        `Invalid status transition from "${listing.status}" to "${status}".`
      );
    }

    const updates: Partial<FoodListing> = { status };
    if (status === 'Picked_Up' || status === 'Collected') {
      updates.pickupStatus = 'Picked_Up';
    }
    const updated = await listingRepository.update(id, updates);
    res.status(200).json({
      message: `Status updated to ${status}`,
      listing: updated
    });
  }
};
