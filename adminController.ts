import { Request, Response } from 'express';
import { userRepository } from '../database/repositories/userRepository.ts';
import { listingRepository } from '../database/repositories/listingRepository.ts';
import { allocationRepository } from '../database/repositories/allocationRepository.ts';
import { assistanceRepository } from '../database/repositories/assistanceRepository.ts';
import { campaignRepository } from '../database/repositories/campaignRepository.ts';
import { donationRepository } from '../database/repositories/donationRepository.ts';
import { complaintRepository } from '../database/repositories/complaintRepository.ts';
import { auditRepository } from '../database/repositories/auditRepository.ts';
import { settingsRepository } from '../database/repositories/settingsRepository.ts';
import { listingService } from '../services/listingService.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';
import { AppError } from '../utils/errors.ts';
import { Complaint } from '@shared/types.ts';

export const adminController = {
  // --- PLATFORM STATS ---
  getStats: async (req: AuthenticatedRequest, res: Response) => {
    const { city, province } = req.query as any;

    let users = await userRepository.findAll();
    let listings = await listingRepository.findAll();
    let assistanceCases = await assistanceRepository.findAllCases();
    let distributions = await allocationRepository.findAllDistributions();
    let allocations = await allocationRepository.findAll();
    let complaints = await complaintRepository.findAll();
    const settings = await settingsRepository.getSettings();

    if (city && city !== 'All Cities' && city !== 'Pakistan') {
      const cleanCity = (city as string).toLowerCase().trim();
      users = users.filter(u => u.city?.toLowerCase() === cleanCity);
      listings = listings.filter(l => l.city?.toLowerCase() === cleanCity);
      assistanceCases = assistanceCases.filter(n => n.city?.toLowerCase() === cleanCity);
      distributions = distributions.filter(d => d.city?.toLowerCase() === cleanCity);
      allocations = allocations.filter(a => a.city?.toLowerCase() === cleanCity);
      complaints = complaints.filter(c => c.city?.toLowerCase() === cleanCity);
    } else if (province && province !== 'All Provinces') {
      const cleanProv = (province as string).toLowerCase().trim();
      users = users.filter(u => u.province?.toLowerCase() === cleanProv);
      listings = listings.filter(l => l.province?.toLowerCase() === cleanProv);
    }

    const restaurants = users.filter(u => u.role === 'Restaurant');
    const verifiedRestaurants = restaurants.filter(u => u.verificationStatus === 'Verified' || u.verificationStatus === 'Approved');
    const pendingRestaurants = restaurants.filter(u => u.verificationStatus === 'Pending');

    const ngos = users.filter(u => u.role === 'NGO');
    const verifiedNgos = ngos.filter(u => u.verificationStatus === 'Verified' || u.verificationStatus === 'Approved');
    const pendingNgos = ngos.filter(u => u.verificationStatus === 'Pending');

    const donors = users.filter(u => u.role === 'Donor');
    const digitalBeneficiaries = users.filter(u => u.role === 'Beneficiary');
    const totalBeneficiaries = digitalBeneficiaries.length + assistanceCases.length;

    const activeDonations = listings.filter(l => l.status === 'Available' || l.status === 'Matched');
    const acceptedDonations = listings.filter(l => l.status === 'Accepted' || l.status === 'Pickup_Scheduled');
    const completedDonations = listings.filter(l => l.status === 'Completed' || l.status === 'Distributed');
    const expiredDonations = listings.filter(l => l.status === 'Expired');

    const activeAllocations = allocations.filter(a => a.status === 'Active');
    const deliveredAllocations = allocations.filter(a => a.status === 'Delivered');

    const totalMealsDistributed = distributions.reduce((acc, d) => acc + (d.quantity || 1), 0);

    const campaigns = await campaignRepository.findAll();
    const financialDonations = await donationRepository.findAllDonations({ status: 'Successful' });
    const applications = await assistanceRepository.findAllApplications();

    const totalDonationsPkr = financialDonations.reduce((sum, d) => sum + d.amountPkr, 0);
    const totalMealsSponsored = financialDonations.reduce((sum, d) => sum + d.mealsFunded, 0);

    res.status(200).json({
      stats: {
        filterScope: city || province || 'Pakistan National',
        totalUsers: users.length,
        restaurantsCount: restaurants.length,
        verifiedRestaurantsCount: verifiedRestaurants.length,
        pendingRestaurantsCount: pendingRestaurants.length,
        ngosCount: ngos.length,
        verifiedNgosCount: verifiedNgos.length,
        pendingNgosCount: pendingNgos.length,
        donorsCount: donors.length,
        digitalBeneficiariesCount: digitalBeneficiaries.length,
        offlineBeneficiariesCount: assistanceCases.length,
        totalBeneficiariesCount: totalBeneficiaries,
        activeDonationsCount: activeDonations.length,
        acceptedDonationsCount: acceptedDonations.length,
        completedDonationsCount: completedDonations.length,
        expiredDonationsCount: expiredDonations.length,
        totalDonationsCount: listings.length,
        activeAllocationsCount: activeAllocations.length,
        deliveredAllocationsCount: deliveredAllocations.length,
        totalDistributionsCount: distributions.length,
        totalMealsDistributed,
        totalSponsoredPkr: totalDonationsPkr,
        totalMealsSponsored,
        totalFinancialDonationsCount: financialDonations.length,
        totalFinancialDonationsPkr: totalDonationsPkr,
        campaignsCount: campaigns.length,
        activeCampaignsCount: campaigns.filter(c => c.status === 'Active').length,
        pendingApplicationsCount: applications.filter(a => a.status === 'Pending' || a.status === 'Under_Review').length,
        pendingComplaintsCount: complaints.filter(c => c.status === 'Pending' || c.status === 'Under_Investigation').length,
        totalComplaintsCount: complaints.length,
        distributionPeriodMode: settings.distributionPeriodMode,
        maxMealsPerPeriodPerBeneficiary: settings.maxMealsPerPeriodPerBeneficiary
      }
    });
  },

  // --- PUBLIC SAFE SETTINGS ---
  getPublicSettings: async (req: Request, res: Response) => {
    const pub = await settingsRepository.getPublicSettings();
    res.status(200).json({ settings: pub });
  },

  // --- AUTHENTICATED ADMIN SETTINGS ---
  getSettings: async (req: AuthenticatedRequest, res: Response) => {
    const settings = await settingsRepository.getSettings();
    res.status(200).json({ settings });
  },

  updateSettings: async (req: AuthenticatedRequest, res: Response) => {
    const updated = await settingsRepository.updateSettings(req.body);

    await auditRepository.create({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: 'Admin',
      action: 'UPDATE_PLATFORM_SETTINGS',
      details: `Admin updated platform operational settings.`
    });

    res.status(200).json({
      message: 'Platform settings updated successfully',
      settings: updated
    });
  },

  // --- AUDIT LOGS ---
  getAuditLogs: async (req: AuthenticatedRequest, res: Response) => {
    const logs = await auditRepository.findAll();
    res.status(200).json({ logs });
  },

  // --- COMPLAINTS ---
  getComplaints: async (req: AuthenticatedRequest, res: Response) => {
    const { city, status } = req.query as any;
    const complaints = await complaintRepository.findAll({ city, status });
    res.status(200).json({ complaints });
  },

  createComplaint: async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const newComplaint: Complaint = {
      id: `comp-${crypto.randomUUID()}`,
      reporterId: user.id,
      reporterName: user.name,
      reporterRole: user.role,
      targetId: req.body.targetId,
      targetName: req.body.targetName,
      category: req.body.category,
      description: req.body.description.trim(),
      city: req.body.city || user.city,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    const saved = await complaintRepository.create(newComplaint);
    res.status(201).json({
      message: 'Complaint submitted for admin review.',
      complaint: saved
    });
  },

  updateComplaint: async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const { status, adminNotes } = req.body;

    const updated = await complaintRepository.update(id, {
      status,
      adminNotes: adminNotes?.trim()
    });

    if (!updated) {
      throw AppError.notFound('Complaint record not found');
    }

    res.status(200).json({
      message: 'Complaint status updated.',
      complaint: updated
    });
  },

  updateCampaignStatus: async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const { status } = req.body;

    const updated = await campaignRepository.update(id, { status });
    if (!updated) {
      throw AppError.notFound('Campaign not found');
    }

    res.status(200).json({
      message: `Campaign status updated to ${status}.`,
      campaign: updated
    });
  },

  // --- SUSPEND USER (WITH SIDE-EFFECT CLEANUP) ---
  suspendUser: async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const { reason } = req.body;

    const user = await userRepository.findById(id);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const updated = await userRepository.update(id, {
      verificationStatus: 'Suspended'
    });

    // Cleanup active commitments
    await listingService.handleUserDeactivationSideEffects(user.id, user.role);

    await auditRepository.create({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: 'Admin',
      action: 'SUSPEND_USER',
      details: `Suspended user ${user.name} (${user.id}). Reason: ${reason || 'Violation of platform terms'}`
    });

    res.status(200).json({
      message: `User ${user.name} has been suspended. Active listings and claims have been reconciled.`,
      user: userRepository.sanitizeUser(updated!)
    });
  }
};
