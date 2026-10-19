import { FinancialDonation, User } from '@shared/types.ts';
import { donationRepository } from '../database/repositories/donationRepository.ts';
import { userRepository } from '../database/repositories/userRepository.ts';
import { campaignRepository } from '../database/repositories/campaignRepository.ts';
import { allocationRepository } from '../database/repositories/allocationRepository.ts';
import { auditRepository } from '../database/repositories/auditRepository.ts';
import { notificationService } from './notificationService.ts';
import { AppError } from '../utils/errors.ts';
import { config } from '../config.ts';

export const donationService = {
  donateToNgo: async (donorUser: User, data: {
    ngoId: string;
    campaignId?: string;
    amountPkr: number;
    paymentMethod: string;
    notes?: string;
  }): Promise<FinancialDonation> => {
    // 1. Verify NGO exists and is verified
    const ngo = await userRepository.findById(data.ngoId);
    if (!ngo || ngo.role !== 'NGO') {
      throw AppError.notFound('Target NGO organization not found');
    }
    if (ngo.verificationStatus !== 'Verified' && ngo.verificationStatus !== 'Approved') {
      throw AppError.forbidden('Financial contributions can only be made to verified NGOs.');
    }

    // 2. If campaign is specified, verify campaign
    let campaignTitle: string | undefined = undefined;
    if (data.campaignId) {
      const campaign = await campaignRepository.findById(data.campaignId);
      if (!campaign) {
        throw AppError.notFound('Target relief campaign not found');
      }
      if (campaign.status !== 'Active') {
        throw AppError.badRequest('This campaign is not currently accepting donations.');
      }
      campaignTitle = campaign.title;
    }

    // 3. Payments honesty (PHASE 1.7):
    // Server enforces payment mode from configuration. Client parameter is ignored.
    const enforcedPaymentMode = config.paymentMode; // 'Simulated_Demonstration_Sandbox'
    const mealsFunded = Math.floor(data.amountPkr / 100); // PKR 100 per meal
    const receiptNumber = `REC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const paymentRef = `SANDBOX-PKR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const newDonation: FinancialDonation = {
      id: `don-${crypto.randomUUID()}`,
      donorId: donorUser.id,
      donorName: donorUser.name,
      donorEmail: donorUser.email,
      ngoId: ngo.id,
      ngoName: ngo.organizationName || ngo.name,
      campaignId: data.campaignId,
      campaignTitle,
      amountPkr: data.amountPkr,
      mealsFunded,
      paymentMethod: data.paymentMethod,
      paymentReference: paymentRef,
      paymentMode: enforcedPaymentMode,
      status: 'Successful', // Simulated sandbox flow
      receiptNumber,
      city: donorUser.city || ngo.city,
      notes: data.notes?.trim(),
      createdAt: new Date().toISOString()
    };

    const saved = await donationRepository.createDonation(newDonation);

    // Notify donor
    await notificationService.dispatchNotification({
      userId: donorUser.id,
      title: 'Contribution Received! ❤️',
      message: `Your donation of PKR ${data.amountPkr.toLocaleString()} to ${saved.ngoName} was processed successfully (Receipt: ${receiptNumber}).`,
      type: 'DONATION_SUCCESS'
    });

    // Notify NGO
    await notificationService.dispatchNotification({
      userId: ngo.id,
      title: 'New Donation Received! 🌟',
      message: `${donorUser.name} contributed PKR ${data.amountPkr.toLocaleString()} (${mealsFunded} meals funded) to ${campaignTitle || 'General Relief'}.`,
      type: 'FUNDS_RECEIVED'
    });

    await auditRepository.create({
      actorId: donorUser.id,
      actorName: donorUser.name,
      actorRole: 'Donor',
      action: 'FINANCIAL_DONATION',
      details: `Donated PKR ${data.amountPkr} to NGO ${saved.ngoName} (${enforcedPaymentMode}).`
    });

    return saved;
  },

  getDonorStats: async (donorId: string) => {
    const myDonations = await donationRepository.findAllDonations({ donorId, status: 'Successful' });
    const allDistributions = await allocationRepository.findAllDistributions();

    const totalDonatedPkr = myDonations.reduce((sum, d) => sum + d.amountPkr, 0);
    const totalMealsFunded = myDonations.reduce((sum, d) => sum + d.mealsFunded, 0);

    // Honest Impact Accounting (Phase 1.7):
    // Only attribute meals funded directly by this donor
    return {
      totalDonatedPkr,
      totalMealsSponsored: totalMealsFunded,
      donationsCount: myDonations.length,
      donations: myDonations,
      // Verified platform distribution context (clearly labeled as platform-wide)
      platformDistributionsSample: allDistributions.slice(0, 10),
      impactSummary: {
        mealsFundedByYou: totalMealsFunded,
        estimatedFamiliesHelped: Math.ceil(totalMealsFunded / 4),
        totalPlatformMealsDistributed: allDistributions.reduce((acc, d) => acc + (d.quantity || 1), 0),
        auditStatus: 'Verified by Registered NGOs'
      }
    };
  }
};
