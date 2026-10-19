import { Response } from 'express';
import { assistanceRepository } from '../database/repositories/assistanceRepository.ts';
import { allocationRepository } from '../database/repositories/allocationRepository.ts';
import { userRepository } from '../database/repositories/userRepository.ts';
import { auditRepository } from '../database/repositories/auditRepository.ts';
import { allocationService } from '../services/allocationService.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';
import { encryptCnic, hashCnic } from '../utils/crypto.ts';
import { AppError } from '../utils/errors.ts';
import { AssistanceCase } from '@shared/types.ts';

export const assistanceController = {
  // --- ASSISTANCE CASES (OFFLINE BENEFICIARIES) ---
  getAssistanceCases: async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const filters = user.role === 'Admin' ? {} : { ngoId: user.id };
    const cases = await assistanceRepository.findAllCases(filters);

    res.status(200).json({
      assistanceCases: cases.map(assistanceRepository.sanitizeCase),
      // Backwards compatibility alias for /needy clients
      needyPeople: cases.map(assistanceRepository.sanitizeCase)
    });
  },

  createAssistanceCase: async (req: AuthenticatedRequest, res: Response) => {
    const ngoId = req.user!.id;
    const { name, phone, cnic, city, area, address, householdSize, urgency } = req.body;

    const cnicHashVal = hashCnic(cnic);

    // Duplicate check across offline cases
    const existingCase = await assistanceRepository.findCaseByCnicHash(cnicHashVal);
    if (existingCase) {
      throw AppError.conflict('An assistance applicant with this National CNIC is already registered.');
    }

    // Duplicate check across digital users
    const existingUser = await userRepository.findByCnicHash(cnicHashVal);
    if (existingUser) {
      throw AppError.conflict('An account with this National CNIC is already registered as a digital user.');
    }

    const newCase: AssistanceCase = {
      id: `case-${crypto.randomUUID()}`,
      name: name.trim(),
      phone: phone?.trim() || 'N/A (No Phone)',
      cnic: encryptCnic(cnic),
      cnicHash: cnicHashVal,
      city: city.trim(),
      area: area?.trim() || 'Local Area',
      address: address.trim(),
      householdSize: Number(householdSize) || 4,
      urgency: urgency || 'Medium',
      eligibilityStatus: 'Verified',
      hasSmartphone: false,
      registeredByNgoId: ngoId,
      registeredByNgoName: req.user!.name,
      createdAt: new Date().toISOString()
    };

    const created = await assistanceRepository.createCase(newCase);

    await auditRepository.create({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: 'NGO',
      action: 'REGISTER_ASSISTANCE_CASE',
      details: `Registered offline assistance case for ${created.name} in ${created.city}.`
    });

    res.status(201).json({
      message: 'Assistance case successfully registered for community food allocation.',
      assistanceCase: assistanceRepository.sanitizeCase(created)
    });
  },

  deleteAssistanceCase: async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const caseItem = await assistanceRepository.findCaseById(id);
    if (!caseItem) {
      throw AppError.notFound('Assistance case not found');
    }

    if (caseItem.registeredByNgoId !== req.user!.id && req.user!.role !== 'Admin') {
      throw AppError.forbidden('Forbidden: You can only remove assistance cases registered by your organization');
    }

    await assistanceRepository.deleteCase(id);
    res.status(200).json({ message: 'Assistance case removed successfully.' });
  },

  // --- ALLOCATIONS ---
  createAllocation: async (req: AuthenticatedRequest, res: Response) => {
    const user = await userRepository.findById(req.user!.id);
    if (!user) {
      throw AppError.notFound('User profile not found');
    }

    const result = await allocationService.createAllocation(user, req.body);
    res.status(201).json({
      message: `Successfully allocated ${result.quantity} meals of "${result.foodName}" to ${result.beneficiaryName}.`,
      allocation: result
    });
  },

  getAllocations: async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const filters = user.role === 'Admin' ? {} : { ngoId: user.id };
    const allocations = await allocationRepository.findAll(filters);
    res.status(200).json({ allocations });
  },

  getMyAllocations: async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const allocations = await allocationRepository.findAll({ beneficiaryId: user.id });
    res.status(200).json({ allocations });
  },

  confirmAllocationReceipt: async (req: AuthenticatedRequest, res: Response) => {
    const user = await userRepository.findById(req.user!.id);
    if (!user) {
      throw AppError.notFound('User profile not found');
    }

    const result = await allocationService.confirmAllocationReceipt(user, req.body);
    res.status(200).json({
      message: `Meal handover confirmed successfully for ${result.allocation.beneficiaryName}!`,
      allocation: result.allocation,
      distribution: result.distribution
    });
  },

  cancelAllocation: async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const user = await userRepository.findById(req.user!.id);
    if (!user) {
      throw AppError.notFound('User profile not found');
    }

    const cancelled = await allocationService.cancelAllocation(id, user);
    res.status(200).json({
      message: 'Allocation cancelled and quantity restored to listing.',
      allocation: cancelled
    });
  },

  // --- DISTRIBUTIONS (AUDIT TRAIL) ---
  getDistributions: async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const filters = user.role === 'Admin' ? {} : (user.role === 'NGO' ? { volunteerId: user.id } : { beneficiaryId: user.id });
    const distributions = await allocationRepository.findAllDistributions(filters);
    res.status(200).json({ distributions });
  }
};
