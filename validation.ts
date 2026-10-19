import { z } from 'zod';
import { isInsidePakistan } from './locations.ts';

// Helper: Clean CNIC string to 13 digits
export function sanitizeCnic(val: string): string {
  return val.replace(/[-\s]/g, '').trim();
}

// CNIC validator (must be 13 digits)
export const cnicSchema = z.string()
  .min(13, 'CNIC must have 13 digits')
  .max(17, 'CNIC is too long')
  .refine(val => {
    const clean = sanitizeCnic(val);
    return /^\d{13}$/.test(clean);
  }, {
    message: 'CNIC must be a valid 13-digit Pakistani National ID number'
  });

// Coordinates validator within Pakistan
export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
}).strict().refine(c => isInsidePakistan(c.lat, c.lng), {
  message: 'Coordinates must be inside Pakistan territory (lat ~23.5-37.5, lng ~60.5-77.5)'
});

// User registration
export const registerSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(60),
  email: z.string().trim().email('Invalid email address'),
  phone: z.string().trim().min(10, 'Phone must be at least 10 characters').max(20),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  confirmPassword: z.string().optional(),
  role: z.enum(['Donor', 'NGO', 'Restaurant', 'Beneficiary']),
  country: z.string().optional().default('Pakistan'),
  province: z.string().optional(),
  city: z.string().trim().min(2, 'City is required'),
  area: z.string().trim().optional().default('Central'),
  address: z.string().trim().optional().default(''),
  coordinates: coordinatesSchema.optional(),
  
  // Restaurant specifics
  operatingHours: z.string().optional(),
  contactPerson: z.string().optional(),
  foodCategories: z.array(z.string()).optional(),
  
  // NGO specifics
  organizationName: z.string().optional(),
  registrationNumber: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  serviceAreas: z.array(z.string()).optional(),
  mission: z.string().optional(),
  
  // Beneficiary specifics
  cnic: z.string().optional(),
  householdSize: z.number().int().positive().optional(),
  urgency: z.enum(['Low', 'Medium', 'High', 'Emergency']).optional(),
  hasSmartphone: z.boolean().optional(),
}).strict().refine(data => {
  if (data.confirmPassword && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
}).refine(data => {
  if (data.role === 'Beneficiary' && data.cnic) {
    const clean = sanitizeCnic(data.cnic);
    return /^\d{13}$/.test(clean);
  }
  return true;
}, {
  message: 'Beneficiary registration requires a valid 13-digit CNIC',
  path: ['cnic']
});

// User login
export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
}).strict();

// Password reset
export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address')
}).strict();

export const resetPasswordSchema = z.object({
  token: z.string().trim().optional(),
  resetToken: z.string().trim().optional(),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long')
}).refine(data => !!(data.token || data.resetToken), {
  message: 'Reset token is required'
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long')
}).strict();

// Profile update
export const updateProfileSchema = z.object({
  name: z.string().trim().min(3).max(60).optional(),
  phone: z.string().trim().min(10).max(20).optional(),
  city: z.string().trim().min(2).optional(),
  province: z.string().trim().optional(),
  area: z.string().trim().optional(),
  address: z.string().trim().optional(),
  coordinates: coordinatesSchema.optional(),
  bio: z.string().max(500).optional(),
  profileImage: z.string().url().or(z.string().startsWith('data:image/')).optional(),
  operatingHours: z.string().optional(),
  contactPerson: z.string().optional(),
  foodCategories: z.array(z.string()).optional(),
  organizationName: z.string().optional(),
  registrationNumber: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  serviceAreas: z.array(z.string()).optional(),
  mission: z.string().optional(),
  householdSize: z.number().int().positive().optional(),
  urgency: z.enum(['Low', 'Medium', 'High', 'Emergency']).optional(),
  notificationPrefs: z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    push: z.boolean().optional()
  }).optional()
}).strict();

// Create Food Listing
export const createListingSchema = z.object({
  foodName: z.string().trim().min(3, 'Food name must be at least 3 characters').max(100),
  foodCategory: z.string().trim().min(2, 'Category is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.enum(['meals', 'kg', 'packs']).default('meals'),
  description: z.string().trim().max(1000).default(''),
  preparationTime: z.string().trim().default('Just prepared'),
  availableTime: z.string().trim().default('Ready now'),
  pickupDeadline: z.string().trim().refine(val => {
    const d = new Date(val);
    return !isNaN(d.getTime()) && d.getTime() > Date.now();
  }, {
    message: 'Pickup deadline must be a valid future ISO date/time'
  }).transform(val => new Date(val).toISOString()),
  storageCondition: z.enum(['Hot/Insulated', 'Refrigerated', 'Ambient']).default('Hot/Insulated'),
  province: z.string().trim().optional(),
  city: z.string().trim().min(2, 'City is required'),
  area: z.string().trim().optional(),
  pickupAddress: z.string().trim().min(5, 'Pickup address must be at least 5 characters'),
  coordinates: coordinatesSchema.optional(),
  image: z.string().url().or(z.string().startsWith('data:image/')).optional()
}).strict();

// Edit Food Listing
export const editListingSchema = z.object({
  foodName: z.string().trim().min(3).max(100).optional(),
  foodCategory: z.string().trim().min(2).optional(),
  quantity: z.number().positive().optional(),
  unit: z.enum(['meals', 'kg', 'packs']).optional(),
  description: z.string().trim().max(1000).optional(),
  preparationTime: z.string().trim().optional(),
  availableTime: z.string().trim().optional(),
  pickupDeadline: z.string().trim().refine(val => {
    const d = new Date(val);
    return !isNaN(d.getTime());
  }, { message: 'Must be a valid ISO date/time' }).optional(),
  storageCondition: z.enum(['Hot/Insulated', 'Refrigerated', 'Ambient']).optional(),
  pickupAddress: z.string().trim().min(5).optional(),
  coordinates: coordinatesSchema.optional(),
  image: z.string().url().or(z.string().startsWith('data:image/')).optional()
}).strict();

// Update Status Schema
export const updateListingStatusSchema = z.object({
  status: z.enum([
    'Draft', 
    'Available', 
    'Matched', 
    'Accepted', 
    'Pickup_Scheduled', 
    'Picked_Up', 
    'Collected',
    'Distributed', 
    'Completed', 
    'Cancelled', 
    'Expired'
  ])
}).strict();

// Schedule Pickup Schema
export const schedulePickupSchema = z.object({
  scheduledTime: z.string().trim().max(100).optional()
}).strict();

// Create Assistance Case Schema (NGO offline beneficiary)
export const createAssistanceCaseSchema = z.object({
  name: z.string().trim().min(3).max(60),
  phone: z.string().trim().default('N/A (No Phone)'),
  cnic: cnicSchema,
  city: z.string().trim().min(2),
  area: z.string().trim().default('Local Area'),
  address: z.string().trim().min(5),
  householdSize: z.number().int().positive().default(4),
  urgency: z.enum(['Low', 'Medium', 'High', 'Emergency']).default('Medium')
}).strict();

// Create Allocation Schema
export const createAllocationSchema = z.object({
  listingId: z.string().trim().min(1, 'Listing ID is required'),
  beneficiaryType: z.enum(['User', 'AssistanceCase']).default('AssistanceCase'),
  beneficiaryId: z.string().trim().min(1, 'Beneficiary ID is required'),
  quantity: z.number().int().positive('Allocation quantity must be at least 1')
}).strict();

// Confirm Allocation Receipt Schema (no verification code needed)
export const confirmAllocationReceiptSchema = z.object({
  allocationId: z.string().trim().min(1, 'Allocation ID is required'),
  notes: z.string().trim().max(500).optional()
}).strict();

// Financial Donation Schema
export const createDonationSchema = z.object({
  ngoId: z.string().trim().min(1, 'NGO ID is required'),
  campaignId: z.string().trim().optional(),
  amountPkr: z.number().int().min(100, 'Minimum donation is PKR 100'),
  paymentMethod: z.enum([
    'Bank_Transfer',
    'Easypaisa',
    'JazzCash',
    'Simulated_EasyPaisa',
    'Simulated_JazzCash',
    'Simulated_Sandbox_Card',
    'Simulated_Sandbox'
  ]).default('Bank_Transfer'),
  paymentProofReference: z.string().trim().max(100).optional(),
  paymentProofUrl: z.string().optional(),
  notes: z.string().trim().max(500).optional()
}).strict();

export const reviewDonationSchema = z.object({
  status: z.enum(['Completed', 'Rejected']),
  reviewNotes: z.string().trim().max(500).optional()
}).strict();

// Campaign Schema
export const createCampaignSchema = z.object({
  title: z.string().trim().min(5).max(100),
  description: z.string().trim().min(20).max(2000),
  targetAmountPkr: z.number().int().min(1000, 'Target amount must be at least PKR 1,000'),
  targetMeals: z.number().int().min(10, 'Target meals must be at least 10'),
  budgetBreakdown: z.string().trim().max(1000).optional(),
  location: z.string().trim().min(3),
  endDate: z.string().trim().refine(val => {
    const d = new Date(val);
    return !isNaN(d.getTime());
  }, { message: 'End date must be a valid date' }),
  imageUrl: z.string().url().optional()
}).strict();

// Campaign Expense Schema
export const createExpenseSchema = z.object({
  campaignId: z.string().trim().optional(),
  title: z.string().trim().min(5).max(100),
  category: z.enum(['Food_Purchase', 'Packaging_Transportation', 'Kitchen_Ration', 'Emergency_Relief']),
  amountPkr: z.number().int().positive('Amount must be positive'),
  mealsProvided: z.number().int().min(0).default(0),
  date: z.string().trim(),
  vendorName: z.string().trim().optional(),
  receiptProof: z.string().url().optional(),
  notes: z.string().trim().max(500).optional()
}).strict();

// Beneficiary Application Schema
export const beneficiaryApplicationSchema = z.object({
  name: z.string().trim().min(3).max(60),
  phone: z.string().trim().min(10).max(20),
  cnic: cnicSchema,
  householdSize: z.number().int().positive().default(4),
  urgency: z.enum(['Low', 'Medium', 'High', 'Emergency']).default('Medium'),
  incomeMonthlyPkr: z.number().int().min(0).optional(),
  province: z.string().trim().optional(),
  city: z.string().trim().min(2),
  area: z.string().trim().default('Local Area'),
  address: z.string().trim().min(5)
}).strict();

export const reviewApplicationSchema = z.object({
  status: z.enum(['Approved', 'Rejected']),
  rejectionReason: z.string().trim().optional()
}).strict();

export const appealApplicationSchema = z.object({
  appealNotes: z.string().trim().min(10, 'Appeal explanation must be at least 10 characters long')
}).strict();

// Complaint Schema
export const createComplaintSchema = z.object({
  targetId: z.string().trim().optional(),
  targetName: z.string().trim().optional(),
  category: z.enum(['Food Quality', 'No Show Pickup', 'Misbehavior', 'Hygiene', 'Other']),
  description: z.string().trim().min(10, 'Complaint description must be at least 10 characters'),
  city: z.string().trim().optional()
}).strict();

export const updateComplaintSchema = z.object({
  status: z.enum(['Pending', 'Under_Investigation', 'Resolved']),
  adminNotes: z.string().trim().max(500).optional()
}).strict();

// Platform Settings Schema
export const updateSettingsSchema = z.object({
  distributionPeriodMode: z.enum(['Daily', 'Weekly']).optional(),
  maxMealsPerPeriodPerBeneficiary: z.number().int().min(1).max(10).optional(),
  maxMatchingRadiusKm: z.number().int().min(5).max(100).optional(),
  defaultCountry: z.string().trim().optional()
}).strict();

// Pagination Query Schema
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  city: z.string().optional(),
  province: z.string().optional(),
  status: z.string().optional()
});

// Admin Users Query Schema
export const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  role: z.enum(['Admin', 'Restaurant', 'NGO', 'Donor', 'Beneficiary']).optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  verificationStatus: z.enum(['Pending', 'Under_Review', 'Verified', 'Approved', 'Rejected', 'Suspended']).optional(),
  search: z.string().optional()
});

