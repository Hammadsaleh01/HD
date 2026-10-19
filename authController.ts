import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { authService } from '../services/authService.ts';
import { userRepository } from '../database/repositories/userRepository.ts';
import { listingRepository } from '../database/repositories/listingRepository.ts';
import { auditRepository } from '../database/repositories/auditRepository.ts';
import { listingService } from '../services/listingService.ts';
import { RAW_PAKISTAN_PROVINCES, ALL_PAKISTAN_CITIES } from '@shared/locations.ts';
import { UserRole, VerificationStatus } from '@shared/types.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';
import { AppError } from '../utils/errors.ts';

export const authController = {
  // --- USER REGISTRATION ---
  register: async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    // Optionally set httpOnly cookie for web security
    res.cookie('plateshare_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    res.status(201).json({
      message: 'Account successfully registered.',
      user: result.user,
      token: result.token
    });
  },

  // --- USER LOGIN ---
  login: async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.cookie('plateshare_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    res.status(200).json({
      message: 'Login successful.',
      user: result.user,
      token: result.token
    });
  },

  // --- FORGOT PASSWORD (NO TOKEN LEAK IN RESPONSE) ---
  forgotPassword: async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    res.status(200).json(result);
  },

  // --- RESET PASSWORD (COMPARES HASHES) ---
  resetPassword: async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword(token, newPassword);
    res.status(200).json(result);
  },

  // --- CURRENT USER INFO ---
  getMe: async (req: AuthenticatedRequest, res: Response) => {
    const user = await userRepository.findById(req.user!.id);
    if (!user) {
      throw AppError.notFound('User not found');
    }
    res.status(200).json({ user: userRepository.sanitizeUser(user) });
  },

  // --- UPDATE PROFILE ---
  updateProfile: async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const updated = await userRepository.update(userId, req.body);
    if (!updated) {
      throw AppError.notFound('User not found');
    }
    res.status(200).json({
      message: 'Profile updated successfully',
      user: userRepository.sanitizeUser(updated)
    });
  },

  // --- CHANGE PASSWORD ---
  changePassword: async (req: AuthenticatedRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const user = await userRepository.findById(req.user!.id);
    if (!user || !user.password) {
      throw AppError.notFound('User account not found');
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      throw AppError.badRequest('Incorrect current password');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await userRepository.update(user.id, { password: hashed });

    res.status(200).json({ message: 'Password changed successfully' });
  },

  // --- ADMIN / NGO: VERIFY BENEFICIARY ---
  verifyBeneficiary: async (req: AuthenticatedRequest, res: Response) => {
    const { userId, status, notes } = req.body;
    const target = await userRepository.findById(userId);
    if (!target || target.role !== 'Beneficiary') {
      throw AppError.notFound('Beneficiary account not found');
    }

    const newStatus: VerificationStatus = 
      (status === 'Verified' || status === 'Approved') ? 'Verified' :
      (status === 'Suspended') ? 'Suspended' : 'Rejected';

    const updated = await userRepository.update(userId, {
      verificationStatus: newStatus,
      eligibilityStatus: newStatus
    });

    await auditRepository.create({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'VERIFY_BENEFICIARY',
      details: `${req.user!.name} updated beneficiary ${target.name} (${target.id}) verification to ${newStatus}. Notes: ${notes || 'None'}`
    });

    res.status(200).json({
      message: `Beneficiary account status updated to ${newStatus}.`,
      user: userRepository.sanitizeUser(updated!)
    });
  },

  // --- ADMIN: VERIFY NGO ---
  verifyNgo: async (req: AuthenticatedRequest, res: Response) => {
    const { ngoId, status, notes } = req.body;
    const target = await userRepository.findById(ngoId);
    if (!target || target.role !== 'NGO') {
      throw AppError.notFound('NGO account not found');
    }

    const newStatus = status === 'Approved' ? 'Verified' : (status || 'Rejected');
    const updated = await userRepository.update(ngoId, { verificationStatus: newStatus });

    await auditRepository.create({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: 'Admin',
      action: 'VERIFY_NGO',
      details: `Admin set NGO ${target.name} verification status to ${newStatus}. Notes: ${notes || 'None'}`
    });

    res.status(200).json({
      message: `NGO verification status updated to ${newStatus}`,
      user: userRepository.sanitizeUser(updated!)
    });
  },

  // --- ADMIN: VERIFY RESTAURANT ---
  verifyRestaurant: async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId, status, notes } = req.body;
    const target = await userRepository.findById(restaurantId);
    if (!target || target.role !== 'Restaurant') {
      throw AppError.notFound('Restaurant account not found');
    }

    const newStatus = status === 'Approved' ? 'Verified' : (status || 'Rejected');
    const updated = await userRepository.update(restaurantId, { verificationStatus: newStatus });

    await auditRepository.create({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: 'Admin',
      action: 'VERIFY_RESTAURANT',
      details: `Admin set Restaurant ${target.name} verification status to ${newStatus}. Notes: ${notes || 'None'}`
    });

    res.status(200).json({
      message: `Restaurant verification status updated to ${newStatus}`,
      user: userRepository.sanitizeUser(updated!)
    });
  },

  // --- ADMIN: GET ALL USERS (WITH PAGINATION AND PII MASKING) ---
  getAllUsers: async (req: AuthenticatedRequest, res: Response) => {
    const { role, city, province, verificationStatus, search, page = 1, limit = 100 } = req.query as any;
    let users = await userRepository.findAll({
      role: role ? (role as UserRole) : undefined,
      city: city && city !== 'All Cities' ? String(city) : undefined,
      verificationStatus: verificationStatus ? (verificationStatus as VerificationStatus) : undefined
    });

    if (province && province !== 'All Provinces') {
      const cleanProv = String(province).toLowerCase().trim();
      users = users.filter(u => u.province?.toLowerCase() === cleanProv);
    }

    // Apply search filter (name/email)
    if (search && String(search).trim()) {
      const q = String(search).toLowerCase().trim();
      users = users.filter(u => 
        u.name.toLowerCase().includes(q) || 
        u.email.toLowerCase().includes(q)
      );
    }

    // Sort by createdAt DESC (newest first)
    users.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(500, Math.max(1, Number(limit) || 100));
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = users.slice(startIndex, startIndex + limitNum).map(userRepository.sanitizeUser);

    res.status(200).json({
      total: users.length,
      page: pageNum,
      limit: limitNum,
      users: paginated
    });
  },

  // --- ADMIN: DELETE USER (HANDLES ORPHANS AND SIDE EFFECTS) ---
  deleteUser: async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const user = await userRepository.findById(id);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    // Clean up active listings/claims before deleting user
    await listingService.handleUserDeactivationSideEffects(user.id, user.role);
    await userRepository.delete(id);

    await auditRepository.create({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: 'Admin',
      action: 'DELETE_USER',
      details: `Deleted user ${user.name} (${user.id}, role: ${user.role}). Cleaned up active commitments.`
    });

    res.status(200).json({ message: 'User deleted and related dependencies cleaned up.' });
  },

  // --- PAKISTAN STRUCTURED LOCATIONS ---
  getLocations: async (req: Request, res: Response) => {
    res.status(200).json({
      country: 'Pakistan',
      provinces: RAW_PAKISTAN_PROVINCES,
      cities: ALL_PAKISTAN_CITIES
    });
  },

  getCityStats: async (req: Request, res: Response) => {
    const users = await userRepository.findAll();
    const listings = await listingRepository.findAll();

    const cityStats: Record<string, { restaurants: number; ngos: number; activeListings: number }> = {};
    for (const city of ALL_PAKISTAN_CITIES) {
      cityStats[city.name] = {
        restaurants: users.filter(u => u.city?.toLowerCase() === city.name.toLowerCase() && u.role === 'Restaurant').length,
        ngos: users.filter(u => u.city?.toLowerCase() === city.name.toLowerCase() && u.role === 'NGO').length,
        activeListings: listings.filter(l => l.city?.toLowerCase() === city.name.toLowerCase() && (l.status === 'Available' || l.status === 'Matched')).length
      };
    }

    res.status(200).json({ cityStats });
  }
};
