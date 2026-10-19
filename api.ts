import express from 'express';
import { authController } from '../controllers/authController.ts';
import { listingController } from '../controllers/listingController.ts';
import { notificationController } from '../controllers/notificationController.ts';
import { assistanceController } from '../controllers/assistanceController.ts';
import { adminController } from '../controllers/adminController.ts';
import { sponsorController } from '../controllers/sponsorController.ts';
import { campaignController } from '../controllers/campaignController.ts';
import { 
  authenticateJWT, 
  requireRole, 
  requireAdmin, 
  requireVerifiedRestaurant, 
  requireVerifiedNGO 
} from '../middleware/auth.ts';
import { validateBody, validateQuery } from '../middleware/validate.ts';
import { authRateLimiter } from '../middleware/rateLimiter.ts';
import { asyncHandler } from '../utils/errors.ts';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  createListingSchema,
  editListingSchema,
  updateListingStatusSchema,
  schedulePickupSchema,
  createAssistanceCaseSchema,
  createAllocationSchema,
  confirmAllocationReceiptSchema,
  createDonationSchema,
  createCampaignSchema,
  createExpenseSchema,
  beneficiaryApplicationSchema,
  reviewApplicationSchema,
  appealApplicationSchema,
  createComplaintSchema,
  updateComplaintSchema,
  updateSettingsSchema,
  paginationQuerySchema,
  adminUsersQuerySchema
} from '@shared/validation.ts';

import { docsHandler } from './docs.ts';

const apiRouter = express.Router();

// --- OpenAPI Documentation ---
apiRouter.get('/docs', docsHandler);
apiRouter.get('/docs/spec.json', docsHandler);

// --- Auth & User Profile Routes ---
apiRouter.post(
  '/auth/register',
  authRateLimiter,
  validateBody(registerSchema),
  asyncHandler(authController.register)
);

apiRouter.post(
  '/auth/login',
  authRateLimiter,
  validateBody(loginSchema),
  asyncHandler(authController.login)
);

apiRouter.post(
  '/auth/forgot-password',
  authRateLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword)
);

apiRouter.post(
  '/auth/reset-password',
  authRateLimiter,
  validateBody(resetPasswordSchema),
  asyncHandler(authController.resetPassword)
);

apiRouter.get(
  '/auth/me',
  asyncHandler(authenticateJWT),
  asyncHandler(authController.getMe)
);

apiRouter.put(
  '/auth/profile',
  asyncHandler(authenticateJWT),
  validateBody(updateProfileSchema),
  asyncHandler(authController.updateProfile)
);

apiRouter.post(
  '/auth/change-password',
  asyncHandler(authenticateJWT),
  validateBody(changePasswordSchema),
  asyncHandler(authController.changePassword)
);

// --- Admin Verification & User Management Routes ---
apiRouter.post(
  '/auth/verify-ngo',
  asyncHandler(authenticateJWT),
  requireAdmin(),
  asyncHandler(authController.verifyNgo)
);

apiRouter.post(
  '/auth/verify-restaurant',
  asyncHandler(authenticateJWT),
  requireAdmin(),
  asyncHandler(authController.verifyRestaurant)
);

apiRouter.post(
  '/auth/verify-beneficiary',
  asyncHandler(authenticateJWT),
  requireRole(['Admin', 'NGO']),
  asyncHandler(authController.verifyBeneficiary)
);

apiRouter.get(
  '/users',
  asyncHandler(authenticateJWT),
  requireAdmin(),
  validateQuery(adminUsersQuerySchema),
  asyncHandler(authController.getAllUsers)
);

apiRouter.delete(
  '/users/:id',
  asyncHandler(authenticateJWT),
  requireAdmin(),
  asyncHandler(authController.deleteUser)
);

// --- Pakistan Structured Locations & Real Stats ---
apiRouter.get('/locations', asyncHandler(authController.getLocations));
apiRouter.get('/locations/stats', asyncHandler(authController.getCityStats));

// --- Food Listing Routes ---
// Public listings (sensitive fields stripped)
apiRouter.get(
  '/listings',
  validateQuery(paginationQuerySchema),
  asyncHandler(listingController.getAllListings)
);

apiRouter.get(
  '/listings/my',
  asyncHandler(authenticateJWT),
  requireRole(['Donor', 'Restaurant', 'NGO', 'Admin']),
  asyncHandler(listingController.getMyListings)
);

apiRouter.get(
  '/listings/:id',
  asyncHandler(listingController.getListingById)
);

// Authenticated handover details (visible only to claiming NGO, donor, and admin)
apiRouter.get(
  '/listings/:id/handover-status',
  asyncHandler(authenticateJWT),
  asyncHandler(listingController.getHandoverDetails)
);

// Create donation (Verified Restaurant OR verified Donor)
apiRouter.post(
  '/listings',
  asyncHandler(authenticateJWT),
  asyncHandler(requireVerifiedRestaurant),
  validateBody(createListingSchema),
  asyncHandler(listingController.createListing)
);

// NGO Accepts or Claims donation
apiRouter.post(
  ['/listings/:id/accept', '/listings/:id/claim'],
  asyncHandler(authenticateJWT),
  asyncHandler(requireVerifiedNGO),
  asyncHandler(listingController.acceptListing)
);

// Schedule Pickup
apiRouter.post(
  '/listings/:id/schedule-pickup',
  asyncHandler(authenticateJWT),
  asyncHandler(requireVerifiedNGO),
  validateBody(schedulePickupSchema),
  asyncHandler(listingController.schedulePickup)
);

// Confirm food handover (restaurant/donor that owns the listing, or Admin)
apiRouter.post(
  '/listings/:id/confirm-handover',
  asyncHandler(authenticateJWT),
  requireRole(['Restaurant', 'Donor', 'Admin']),
  asyncHandler(listingController.confirmHandover)
);

// Edit / Delete / Status updates
apiRouter.put(
  '/listings/:id',
  asyncHandler(authenticateJWT),
  requireRole(['Donor', 'Restaurant', 'Admin']),
  validateBody(editListingSchema),
  asyncHandler(listingController.editListing)
);

apiRouter.delete(
  '/listings/:id',
  asyncHandler(authenticateJWT),
  requireRole(['Donor', 'Restaurant', 'Admin']),
  asyncHandler(listingController.deleteListing)
);

apiRouter.patch(
  '/listings/:id/status',
  asyncHandler(authenticateJWT),
  requireRole(['Donor', 'Restaurant', 'NGO', 'Admin']),
  validateBody(updateListingStatusSchema),
  asyncHandler(listingController.updateStatus)
);

// --- Assistance Registry ---
apiRouter.get(
  '/assistance',
  asyncHandler(authenticateJWT),
  requireRole(['NGO', 'Admin']),
  asyncHandler(assistanceController.getAssistanceCases)
);

apiRouter.post(
  '/assistance',
  asyncHandler(authenticateJWT),
  asyncHandler(requireVerifiedNGO),
  validateBody(createAssistanceCaseSchema),
  asyncHandler(assistanceController.createAssistanceCase)
);

apiRouter.delete(
  '/assistance/:id',
  asyncHandler(authenticateJWT),
  requireRole(['NGO', 'Admin']),
  asyncHandler(assistanceController.deleteAssistanceCase)
);

// Backward compatibility alias for /needy
apiRouter.get(
  '/needy',
  asyncHandler(authenticateJWT),
  requireRole(['NGO', 'Admin']),
  asyncHandler(assistanceController.getAssistanceCases)
);

apiRouter.post(
  '/needy',
  asyncHandler(authenticateJWT),
  asyncHandler(requireVerifiedNGO),
  validateBody(createAssistanceCaseSchema),
  asyncHandler(assistanceController.createAssistanceCase)
);

apiRouter.delete(
  '/needy/:id',
  asyncHandler(authenticateJWT),
  requireRole(['NGO', 'Admin']),
  asyncHandler(assistanceController.deleteAssistanceCase)
);

// --- Allocations (With Strict Concurrency Mutex & Period Duplicate Protection) ---
apiRouter.get(
  '/allocations',
  asyncHandler(authenticateJWT),
  requireRole(['NGO', 'Admin']),
  asyncHandler(assistanceController.getAllocations)
);

apiRouter.get(
  '/allocations/my',
  asyncHandler(authenticateJWT),
  requireRole(['Beneficiary', 'Admin']),
  asyncHandler(assistanceController.getMyAllocations)
);

apiRouter.post(
  '/allocations',
  asyncHandler(authenticateJWT),
  asyncHandler(requireVerifiedNGO),
  validateBody(createAllocationSchema),
  asyncHandler(assistanceController.createAllocation)
);

// Route alias for /allocations/create
apiRouter.post(
  '/allocations/create',
  asyncHandler(authenticateJWT),
  asyncHandler(requireVerifiedNGO),
  validateBody(createAllocationSchema),
  asyncHandler(assistanceController.createAllocation)
);

apiRouter.post(
  '/allocations/confirm',
  asyncHandler(authenticateJWT),
  requireRole(['Beneficiary', 'NGO', 'Admin']),
  validateBody(confirmAllocationReceiptSchema),
  asyncHandler(assistanceController.confirmAllocationReceipt)
);

apiRouter.post(
  '/allocations/:id/cancel',
  asyncHandler(authenticateJWT),
  requireRole(['NGO', 'Admin']),
  asyncHandler(assistanceController.cancelAllocation)
);

// --- Distributions ---
apiRouter.get(
  '/distributions',
  asyncHandler(authenticateJWT),
  asyncHandler(assistanceController.getDistributions)
);

// --- Donor Financial Sponsorships ---
apiRouter.get(
  '/sponsorships/my',
  asyncHandler(authenticateJWT),
  requireRole(['Donor']),
  asyncHandler(sponsorController.getDonorStats)
);

apiRouter.post(
  '/sponsorships',
  asyncHandler(authenticateJWT),
  requireRole(['Donor']),
  asyncHandler(sponsorController.createSponsorship)
);

// --- Approved NGOs Directory & Relief Campaigns ---
apiRouter.get('/ngos/approved', asyncHandler(campaignController.getApprovedNgos));
apiRouter.get('/campaigns', asyncHandler(campaignController.getAllCampaigns));
apiRouter.get('/campaigns/:id', asyncHandler(campaignController.getCampaignById));

apiRouter.post(
  '/campaigns',
  asyncHandler(authenticateJWT),
  asyncHandler(requireVerifiedNGO),
  validateBody(createCampaignSchema),
  asyncHandler(campaignController.createCampaign)
);

// --- Financial Donations to Verified NGOs ---
apiRouter.post(
  '/donations/ngo',
  asyncHandler(authenticateJWT),
  requireRole(['Donor']),
  validateBody(createDonationSchema),
  asyncHandler(campaignController.donateToNgo)
);

apiRouter.get(
  '/donations/my',
  asyncHandler(authenticateJWT),
  requireRole(['Donor', 'NGO', 'Admin']),
  asyncHandler(campaignController.getDonationsHistory)
);

// --- NGO Food Purchases & Campaign Expenditure Logging ---
apiRouter.post(
  '/expenses',
  asyncHandler(authenticateJWT),
  asyncHandler(requireVerifiedNGO),
  validateBody(createExpenseSchema),
  asyncHandler(campaignController.recordExpense)
);

apiRouter.get(
  '/expenses/my',
  asyncHandler(authenticateJWT),
  requireRole(['NGO', 'Admin']),
  asyncHandler(campaignController.getNgoExpenses)
);

// --- Beneficiary Food Assistance Applications & Reviews ---
apiRouter.post(
  '/applications',
  asyncHandler(authenticateJWT),
  validateBody(beneficiaryApplicationSchema),
  asyncHandler(campaignController.submitBeneficiaryApplication)
);

apiRouter.get(
  '/applications/my',
  asyncHandler(authenticateJWT),
  asyncHandler(campaignController.getMyBeneficiaryApplications)
);

apiRouter.get(
  '/applications',
  asyncHandler(authenticateJWT),
  requireRole(['NGO', 'Admin']),
  asyncHandler(campaignController.getAllBeneficiaryApplications)
);

apiRouter.patch(
  '/applications/:id/review',
  asyncHandler(authenticateJWT),
  requireRole(['NGO', 'Admin']),
  validateBody(reviewApplicationSchema),
  asyncHandler(campaignController.reviewBeneficiaryApplication)
);

apiRouter.post(
  '/applications/:id/appeal',
  asyncHandler(authenticateJWT),
  validateBody(appealApplicationSchema),
  asyncHandler(campaignController.appealBeneficiaryApplication)
);

// --- Admin Console & Operational Settings ---
apiRouter.get(
  '/admin/stats',
  asyncHandler(authenticateJWT),
  requireAdmin(),
  asyncHandler(adminController.getStats)
);

// Public safe settings (Phase 1.8)
apiRouter.get(
  '/settings/public',
  asyncHandler(adminController.getPublicSettings)
);

// Authenticated admin settings: if called without auth, returns safe public view; if admin, returns full
apiRouter.get(
  '/admin/settings',
  asyncHandler(async (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return adminController.getPublicSettings(req, res);
    }
    await authenticateJWT(req, res, () => {
      if (req.user?.role === 'Admin') {
        return adminController.getSettings(req, res);
      }
      return adminController.getPublicSettings(req, res);
    });
  })
);

apiRouter.put(
  '/admin/settings',
  asyncHandler(authenticateJWT),
  requireAdmin(),
  validateBody(updateSettingsSchema),
  asyncHandler(adminController.updateSettings)
);

apiRouter.get(
  '/admin/audit-logs',
  asyncHandler(authenticateJWT),
  requireAdmin(),
  asyncHandler(adminController.getAuditLogs)
);

apiRouter.get(
  '/admin/complaints',
  asyncHandler(authenticateJWT),
  requireRole(['Admin', 'NGO']),
  asyncHandler(adminController.getComplaints)
);

apiRouter.post(
  '/complaints',
  asyncHandler(authenticateJWT),
  validateBody(createComplaintSchema),
  asyncHandler(adminController.createComplaint)
);

apiRouter.patch(
  '/admin/complaints/:id',
  asyncHandler(authenticateJWT),
  requireAdmin(),
  validateBody(updateComplaintSchema),
  asyncHandler(adminController.updateComplaint)
);

apiRouter.patch(
  '/admin/campaigns/:id/status',
  asyncHandler(authenticateJWT),
  requireAdmin(),
  asyncHandler(adminController.updateCampaignStatus)
);

apiRouter.post(
  '/admin/users/:id/suspend',
  asyncHandler(authenticateJWT),
  requireAdmin(),
  asyncHandler(adminController.suspendUser)
);

// --- Notifications ---
apiRouter.get(
  '/notifications',
  asyncHandler(authenticateJWT),
  asyncHandler(notificationController.getMyNotifications)
);

apiRouter.patch(
  '/notifications/:id/read',
  asyncHandler(authenticateJWT),
  asyncHandler(notificationController.markAsRead)
);

apiRouter.post(
  '/notifications/read-all',
  asyncHandler(authenticateJWT),
  asyncHandler(notificationController.markAllAsRead)
);

export default apiRouter;
