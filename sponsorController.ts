import { Response } from 'express';
import { donationService } from '../services/donationService.ts';
import { userRepository } from '../database/repositories/userRepository.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';
import { AppError } from '../utils/errors.ts';

export const sponsorController = {
  getDonorStats: async (req: AuthenticatedRequest, res: Response) => {
    const donorId = req.user!.id;
    const stats = await donationService.getDonorStats(donorId);
    res.status(200).json(stats);
  },

  createSponsorship: async (req: AuthenticatedRequest, res: Response) => {
    const user = await userRepository.findById(req.user!.id);
    if (!user) {
      throw AppError.notFound('Donor profile not found');
    }

    const { amountPkr, campaign, ngoId } = req.body;
    let targetNgoId = ngoId;

    if (!targetNgoId) {
      // Default to first verified NGO
      const ngos = await userRepository.findAll({ role: 'NGO', verificationStatus: 'Verified' });
      targetNgoId = ngos[0]?.id || 'ngo-1';
    }

    const donation = await donationService.donateToNgo(user, {
      ngoId: targetNgoId,
      amountPkr: Number(amountPkr),
      paymentMethod: 'Simulated_EasyPaisa',
      notes: `Sponsorship allocated towards ${campaign || 'Pakistan Community Hunger Relief'}`
    });

    res.status(201).json({
      message: `Successfully sponsored ${donation.mealsFunded} meals! Verified impact record created.`,
      sponsorship: donation
    });
  }
};
