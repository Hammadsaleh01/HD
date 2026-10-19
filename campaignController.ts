import { Request, Response } from 'express';
import { campaignRepository } from '../database/repositories/campaignRepository.ts';
import { donationRepository } from '../database/repositories/donationRepository.ts';
import { userRepository } from '../database/repositories/userRepository.ts';
import { assistanceRepository } from '../database/repositories/assistanceRepository.ts';
import { auditRepository } from '../database/repositories/auditRepository.ts';
import { donationService } from '../services/donationService.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';
import { encryptCnic, hashCnic } from '../utils/crypto.ts';
import { AppError } from '../utils/errors.ts';
import { NgoCampaign, CampaignExpense, BeneficiaryApplication } from '@shared/types.ts';

export const campaignController = {
  // --- APPROVED NGOS DIRECTORY ---
  getApprovedNgos: async (req: Request, res: Response) => {
    const { city } = req.query as any;
    const allUsers = await userRepository.findAll();
    let approvedNgos = allUsers.filter(u =>
      u.role === 'NGO' &&
      (u.verificationStatus === 'Verified' || u.verificationStatus === 'Approved')
    );

    if (city && city !== 'All Cities' && city !== 'Pakistan') {
      const clean = (city as string).toLowerCase().trim();
      approvedNgos = approvedNgos.filter(n => (n.city || '').toLowerCase() === clean);
    }

    const allCampaigns = await campaignRepository.findAll({ status: 'Active' });

    const ngosWithCampaigns = approvedNgos.map(ngo => {
      const ngoCampaigns = allCampaigns.filter(c => c.ngoId === ngo.id);
      return {
        id: ngo.id,
        name: ngo.name,
        organizationName: ngo.organizationName || ngo.name,
        city: ngo.city,
        province: ngo.province,
        area: ngo.area,
        address: ngo.address,
        mission: ngo.mission || 'Alleviating hunger and distributing nourishing meals to vulnerable communities across Pakistan.',
        logoUrl: ngo.logoUrl || ngo.profileImage || 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=100&auto=format&fit=crop&q=60',
        registrationNumber: ngo.registrationNumber,
        verificationStatus: ngo.verificationStatus,
        capacity: ngo.capacity || 100,
        contactPhone: ngo.phone,
        activeCampaignsCount: ngoCampaigns.length,
        campaigns: ngoCampaigns
      };
    });

    res.status(200).json({ ngos: ngosWithCampaigns });
  },

  // --- CAMPAIGNS ---
  getAllCampaigns: async (req: Request, res: Response) => {
    const { city, ngoId, status } = req.query as any;
    const campaigns = await campaignRepository.findAll({
      city,
      ngoId,
      status
    });
    res.status(200).json({ campaigns });
  },

  getCampaignById: async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const campaign = await campaignRepository.findById(id);
    if (!campaign) {
      throw AppError.notFound('Campaign not found');
    }

    const donations = await donationRepository.findAllDonations({ campaignId: id, status: 'Successful' });
    const expenses = await donationRepository.findExpenses({ campaignId: id });

    res.status(200).json({
      campaign,
      totalDonationsCount: donations.length,
      donations: donations.slice(0, 10),
      expenses
    });
  },

  createCampaign: async (req: AuthenticatedRequest, res: Response) => {
    const ngoUser = await userRepository.findById(req.user!.id);
    if (!ngoUser || ngoUser.role !== 'NGO') {
      throw AppError.forbidden('Only registered NGOs can create food relief campaigns.');
    }
    if (ngoUser.verificationStatus !== 'Verified' && ngoUser.verificationStatus !== 'Approved') {
      throw AppError.forbidden('Your NGO must be verified by PlateShare Admin to launch campaigns.');
    }

    const newCampaign: NgoCampaign = {
      id: `camp-${crypto.randomUUID()}`,
      ngoId: ngoUser.id,
      ngoName: ngoUser.organizationName || ngoUser.name,
      ngoCity: ngoUser.city,
      title: req.body.title.trim(),
      description: req.body.description.trim(),
      targetAmountPkr: Number(req.body.targetAmountPkr),
      raisedAmountPkr: 0,
      targetMeals: Number(req.body.targetMeals),
      budgetBreakdown: req.body.budgetBreakdown?.trim(),
      location: req.body.location.trim(),
      endDate: req.body.endDate,
      status: 'Active',
      imageUrl: req.body.imageUrl || 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600&auto=format&fit=crop&q=60',
      createdAt: new Date().toISOString()
    };

    const saved = await campaignRepository.create(newCampaign);

    await auditRepository.create({
      actorId: ngoUser.id,
      actorName: ngoUser.name,
      actorRole: 'NGO',
      action: 'CREATE_CAMPAIGN',
      details: `Created campaign "${saved.title}" in ${saved.location}. Target: PKR ${saved.targetAmountPkr}.`
    });

    res.status(201).json({
      message: 'Campaign created successfully!',
      campaign: saved
    });
  },

  // --- DONATIONS (HONEST SIMULATED SANDBOX) ---
  donateToNgo: async (req: AuthenticatedRequest, res: Response) => {
    const donorUser = await userRepository.findById(req.user!.id);
    if (!donorUser) {
      throw AppError.notFound('Donor user not found');
    }

    const result = await donationService.donateToNgo(donorUser, req.body);
    res.status(201).json({
      message: `Thank you for your generous support! Successfully contributed PKR ${result.amountPkr.toLocaleString()} (${result.mealsFunded} meals funded).`,
      donation: result
    });
  },

  getDonationsHistory: async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    let donations = [];

    if (user.role === 'Admin') {
      donations = await donationRepository.findAllDonations();
    } else if (user.role === 'NGO') {
      donations = await donationRepository.findAllDonations({ ngoId: user.id });
    } else {
      donations = await donationRepository.findAllDonations({ donorId: user.id });
    }

    res.status(200).json({ donations });
  },

  // --- NGO EXPENSES ---
  recordExpense: async (req: AuthenticatedRequest, res: Response) => {
    const ngoUser = await userRepository.findById(req.user!.id);
    if (!ngoUser || ngoUser.role !== 'NGO') {
      throw AppError.forbidden('Only registered NGOs can log relief expenses.');
    }

    const newExpense: CampaignExpense = {
      id: `exp-${crypto.randomUUID()}`,
      ngoId: ngoUser.id,
      ngoName: ngoUser.organizationName || ngoUser.name,
      campaignId: req.body.campaignId,
      title: req.body.title.trim(),
      category: req.body.category,
      amountPkr: Number(req.body.amountPkr),
      mealsProvided: Number(req.body.mealsProvided || 0),
      date: req.body.date,
      vendorName: req.body.vendorName?.trim(),
      receiptProof: req.body.receiptProof,
      notes: req.body.notes?.trim(),
      createdAt: new Date().toISOString()
    };

    const saved = await donationRepository.createExpense(newExpense);
    res.status(201).json({
      message: 'Expense recorded successfully!',
      expense: saved
    });
  },

  getNgoExpenses: async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const filters = user.role === 'Admin' ? {} : { ngoId: user.id };
    const expenses = await donationRepository.findExpenses(filters);
    res.status(200).json({ expenses });
  },

  // --- BENEFICIARY APPLICATIONS ---
  submitBeneficiaryApplication: async (req: AuthenticatedRequest, res: Response) => {
    const { name, phone, cnic, householdSize, urgency, incomeMonthlyPkr, province, city, area, address } = req.body;
    const applicantId = req.user!.id;

    const cnicHashVal = hashCnic(cnic);

    const existingApp = await assistanceRepository.findApplicationByCnicHash(cnicHashVal);
    if (existingApp && existingApp.status === 'Pending') {
      throw AppError.conflict('An active food assistance application is already under review for this CNIC.');
    }

    const newApp: BeneficiaryApplication = {
      id: `app-${crypto.randomUUID()}`,
      applicantId,
      name: name.trim(),
      phone: phone.trim(),
      cnic: encryptCnic(cnic),
      cnicHash: cnicHashVal,
      householdSize: Number(householdSize) || 4,
      urgency: urgency || 'Medium',
      incomeMonthlyPkr: incomeMonthlyPkr !== undefined ? Number(incomeMonthlyPkr) : undefined,
      province,
      city: city.trim(),
      area: area?.trim() || 'Central',
      address: address.trim(),
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    const saved = await assistanceRepository.createApplication(newApp);

    await auditRepository.create({
      actorId: applicantId,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'SUBMIT_BENEFICIARY_APPLICATION',
      details: `Food assistance application submitted by ${saved.name} in ${saved.city}.`
    });

    res.status(201).json({
      message: 'Your application for food assistance has been submitted. Local verified NGOs and PlateShare Admins will review it.',
      application: assistanceRepository.sanitizeApplication(saved)
    });
  },

  getMyBeneficiaryApplications: async (req: AuthenticatedRequest, res: Response) => {
    const apps = await assistanceRepository.findApplicationsByApplicantId(req.user!.id);
    res.status(200).json({
      applications: apps.map(assistanceRepository.sanitizeApplication)
    });
  },

  getAllBeneficiaryApplications: async (req: AuthenticatedRequest, res: Response) => {
    const { city, status } = req.query as any;
    const apps = await assistanceRepository.findAllApplications({ city, status });
    res.status(200).json({
      applications: apps.map(assistanceRepository.sanitizeApplication)
    });
  },

  reviewBeneficiaryApplication: async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const { status, rejectionReason } = req.body;

    const app = await assistanceRepository.findApplicationById(id);
    if (!app) {
      throw AppError.notFound('Application not found');
    }

    const updated = await assistanceRepository.updateApplication(id, {
      status,
      rejectionReason: rejectionReason?.trim(),
      reviewedByUserId: req.user!.id,
      reviewedByUserName: req.user!.name,
      reviewedAt: new Date().toISOString()
    });

    // If applicant has a registered user account, sync their verificationStatus
    if (app.applicantId && status === 'Approved') {
      await userRepository.update(app.applicantId, {
        verificationStatus: 'Verified',
        eligibilityStatus: 'Verified'
      });
    }

    res.status(200).json({
      message: `Application status updated to ${status}.`,
      application: assistanceRepository.sanitizeApplication(updated!)
    });
  },

  appealBeneficiaryApplication: async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const { appealNotes } = req.body;

    const app = await assistanceRepository.findApplicationById(id);
    if (!app) {
      throw AppError.notFound('Application not found');
    }
    if (app.applicantId !== req.user!.id && req.user!.role !== 'Admin') {
      throw AppError.forbidden('Forbidden: You can only appeal your own application');
    }

    const updated = await assistanceRepository.updateApplication(id, {
      status: 'Under_Review',
      appealNotes: appealNotes.trim()
    });

    res.status(200).json({
      message: 'Your appeal has been submitted for secondary review.',
      application: assistanceRepository.sanitizeApplication(updated!)
    });
  }
};
