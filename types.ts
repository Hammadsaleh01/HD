export type UserRole = 'Donor' | 'NGO' | 'Restaurant' | 'Admin' | 'Beneficiary';

export type VerificationStatus = 
  | 'Pending' 
  | 'Under_Review' 
  | 'Approved' 
  | 'Verified' 
  | 'Suspended' 
  | 'Rejected' 
  | 'N/A';

export type DonationStatus = 
  | 'Draft' 
  | 'Available' 
  | 'Matched' 
  | 'Accepted' 
  | 'Pickup_Scheduled' 
  | 'Picked_Up' 
  | 'Collected'
  | 'Distributed' 
  | 'Completed' 
  | 'Cancelled' 
  | 'Expired' 
  | 'Failed';

export type PickupStatus = 'Pending' | 'Scheduled' | 'In_Progress' | 'Picked_Up' | 'Collected' | 'Failed' | 'Cancelled';

export interface Coordinates {
  lat: number;
  lng: number;
}

// Valid state machine transitions for FoodListing status
export const VALID_DONATION_TRANSITIONS: Record<DonationStatus, DonationStatus[]> = {
  Draft: ['Available', 'Cancelled'],
  Available: ['Matched', 'Accepted', 'Cancelled', 'Expired'],
  Matched: ['Accepted', 'Available', 'Cancelled', 'Expired'],
  Accepted: ['Pickup_Scheduled', 'Cancelled', 'Failed'],
  Pickup_Scheduled: ['Picked_Up', 'Collected', 'Accepted', 'Cancelled', 'Failed'],
  Picked_Up: ['Distributed', 'Completed', 'Collected'],
  Collected: ['Distributed', 'Completed', 'Picked_Up'],
  Distributed: ['Completed'],
  Completed: [],
  Cancelled: [],
  Expired: [],
  Failed: ['Available']
};

export function isValidStatusTransition(currentStatus: DonationStatus, targetStatus: DonationStatus): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = VALID_DONATION_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(targetStatus) : false;
}

export interface MatchedNgoInfo {
  ngoId: string;
  ngoName: string;
  phone: string;
  city: string;
  area: string;
  distanceKm: number;
  capacity: number;
  score: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string; // Secure bcrypt hash
  role: UserRole;
  country?: string;
  province?: string;
  city: string;
  area: string;
  address: string;
  coordinates?: Coordinates;
  verificationStatus: VerificationStatus;
  profileImage?: string;
  bio?: string;
  notificationPrefs?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
  };
  
  // Restaurant specific fields
  operatingHours?: string;
  contactPerson?: string;
  foodCategories?: string[];
  
  // NGO specific fields
  organizationName?: string;
  registrationNumber?: string;
  capacity?: number;
  available?: boolean;
  serviceAreas?: string[];
  verificationDocUrl?: string;
  mission?: string;
  logoUrl?: string;
  
  // Beneficiary specific fields
  cnic?: string; // Encrypted at rest, never leaked unmasked
  cnicHash?: string; // HMAC-SHA256 for duplicate lookup
  householdSize?: number;
  urgency?: 'Low' | 'Medium' | 'High' | 'Emergency';
  eligibilityStatus?: 'Pending' | 'Under_Review' | 'Verified' | 'Temporarily_Eligible' | 'Emergency' | 'Expired' | 'Suspended' | 'Rejected';
  hasSmartphone?: boolean;
  
  // Security & Account Lockout
  failedLoginAttempts?: number;
  lockoutUntil?: string;
  resetPasswordTokenHash?: string;
  resetPasswordExpires?: string;

  createdAt: string;
}

export function toPublicUser(user: User): Omit<User, 'password' | 'resetPasswordTokenHash'> {
  const { password, resetPasswordTokenHash, ...rest } = user;
  const cnicStr = user.cnic || '';
  const clean = cnicStr.replace(/[^0-9]/g, '');
  const last4 = clean.slice(-4);
  return {
    ...rest,
    cnic: last4 ? `****-*******${last4}` : undefined
  };
}

export interface FoodListing {
  id: string;
  donorId: string;
  donorName: string;
  donorRole: UserRole;
  foodName: string;
  foodCategory: string;
  quantity: number;
  remainingQuantity: number;
  allocatedQuantity: number;
  unit: 'meals' | 'kg' | 'packs';
  description: string;
  preparationTime: string;
  availableTime: string;
  pickupDeadline: string; // ISO 8601 string
  storageCondition: 'Hot/Insulated' | 'Refrigerated' | 'Ambient';
  province: string;
  city: string;
  area: string;
  pickupAddress: string;
  coordinates: Coordinates;
  image: string;
  status: DonationStatus;
  claimedByNgoId?: string;
  claimedByNgoName?: string;
  pickupStatus?: PickupStatus;
  pickupScheduledTime?: string;
  handoverConfirmedAt?: string; // Set when the restaurant/donor confirms food was handed over
  handoverConfirmedBy?: string; // User id of the confirming restaurant/donor/admin
  matchedNgos?: MatchedNgoInfo[];
  createdAt: string;
  updatedAt?: string;
}

// Publicly visible FoodListing serializer with sensitive data stripped
export interface PublicFoodListing {
  id: string;
  donorId: string;
  donorName: string;
  donorRole: UserRole;
  foodName: string;
  foodCategory: string;
  quantity: number;
  remainingQuantity: number;
  unit: 'meals' | 'kg' | 'packs';
  description: string;
  preparationTime: string;
  availableTime: string;
  pickupDeadline: string;
  storageCondition: 'Hot/Insulated' | 'Refrigerated' | 'Ambient';
  province: string;
  city: string;
  area: string;
  pickupAddress: string;
  coordinates: Coordinates;
  image: string;
  status: DonationStatus;
  claimedByNgoId?: string;
  claimedByNgoName?: string;
  pickupStatus?: PickupStatus;
  pickupScheduledTime?: string;
  createdAt: string;
  updatedAt?: string;
}

export function toPublicListing(listing: FoodListing): PublicFoodListing {
  return {
    id: listing.id,
    donorId: listing.donorId,
    donorName: listing.donorName,
    donorRole: listing.donorRole,
    foodName: listing.foodName,
    foodCategory: listing.foodCategory,
    quantity: listing.quantity,
    remainingQuantity: listing.remainingQuantity,
    unit: listing.unit,
    description: listing.description,
    preparationTime: listing.preparationTime,
    availableTime: listing.availableTime,
    pickupDeadline: listing.pickupDeadline,
    storageCondition: listing.storageCondition,
    province: listing.province,
    city: listing.city,
    area: listing.area,
    pickupAddress: listing.pickupAddress,
    coordinates: listing.coordinates,
    image: listing.image,
    status: listing.status,
    claimedByNgoId: listing.claimedByNgoId,
    claimedByNgoName: listing.claimedByNgoName,
    pickupStatus: listing.pickupStatus,
    pickupScheduledTime: listing.pickupScheduledTime,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
  };
}

export interface AssistanceCase {
  id: string;
  name: string;
  phone: string;
  cnic?: string; // Encrypted at rest
  cnicHash?: string; // HMAC-SHA256 for unified duplicate detection
  province?: string;
  city: string;
  area: string;
  address: string;
  householdSize: number;
  urgency: 'Low' | 'Medium' | 'High' | 'Emergency';
  eligibilityStatus: 'Verified' | 'Under_Review' | 'Suspended' | 'Temporarily_Eligible' | 'Pending';
  hasSmartphone: boolean;
  registeredByNgoId: string;
  registeredByNgoName: string;
  createdAt: string;
}

// Canonical Beneficiary Reference
export type BeneficiaryType = 'User' | 'AssistanceCase';

export interface CanonicalBeneficiaryRef {
  type: BeneficiaryType;
  id: string;
  name: string;
  phone: string;
  city: string;
  area?: string;
  cnicMasked: string;
  cnicHash?: string;
  isVerified: boolean;
}

// Who confirmed that an allocation was received (no codes involved)
export type HandoverConfirmation = 'Beneficiary_Confirmed' | 'NGO_Confirmed';

export interface FoodAllocation {
  id: string;
  donationId: string;
  foodName: string;
  ngoId: string;
  ngoName: string;
  beneficiaryType: BeneficiaryType;
  beneficiaryId: string;
  beneficiaryName: string;
  quantity: number;
  city: string;
  distributionPeriod: string; // e.g. "2026-10-12" or "2026-W41"
  status: 'Active' | 'Delivered' | 'Cancelled';
  createdAt: string;
  deliveredAt?: string;
  confirmedBy?: HandoverConfirmation;
  staffMember?: string;
}

export interface FoodDistribution {
  id: string;
  allocationId?: string;
  donationId: string;
  foodName?: string;
  beneficiaryType: BeneficiaryType;
  beneficiaryId: string;
  beneficiaryName: string;
  volunteerId: string;
  volunteerName: string;
  quantity: number;
  city?: string;
  distributionPeriod: string;
  confirmedBy: HandoverConfirmation;
  timestamp: string;
  notes: string;
}

export interface FinancialDonation {
  id: string;
  donorId: string;
  donorName: string;
  donorEmail: string;
  ngoId: string;
  ngoName: string;
  campaignId?: string;
  campaignTitle?: string;
  amountPkr: number;
  mealsFunded: number;
  paymentMethod: string;
  paymentReference: string;
  paymentProofReference?: string;
  paymentProofUrl?: string;
  paymentMode: 'Simulated_Demonstration_Sandbox' | 'Manual_Verification' | 'Live_Gateway';
  status: 'Pending' | 'Completed' | 'Successful' | 'Failed' | 'Rejected' | 'Refunded';
  receiptNumber: string;
  city?: string;
  notes?: string;
  adminReviewNotes?: string;
  reviewedByAdminId?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface NgoCampaign {
  id: string;
  ngoId: string;
  ngoName: string;
  ngoCity: string;
  title: string;
  description: string;
  targetAmountPkr: number;
  raisedAmountPkr: number;
  targetMeals: number;
  budgetBreakdown?: string;
  location: string;
  endDate: string;
  status: 'Pending_Approval' | 'Active' | 'Completed' | 'Rejected' | 'Suspended';
  imageUrl?: string;
  createdAt: string;
}

export interface CampaignExpense {
  id: string;
  ngoId: string;
  ngoName: string;
  campaignId?: string;
  campaignTitle?: string;
  title: string;
  category: 'Food_Purchase' | 'Packaging_Transportation' | 'Kitchen_Ration' | 'Emergency_Relief';
  amountPkr: number;
  mealsProvided: number;
  date: string;
  vendorName?: string;
  receiptProof?: string;
  notes?: string;
  createdAt: string;
}

export interface BeneficiaryApplication {
  id: string;
  applicantId?: string;
  name: string;
  phone: string;
  cnic?: string; // Encrypted
  cnicHash?: string;
  householdSize: number;
  urgency: 'Low' | 'Medium' | 'High' | 'Emergency';
  incomeMonthlyPkr?: number;
  province?: string;
  city: string;
  area: string;
  address: string;
  status: 'Pending' | 'Under_Review' | 'Approved' | 'Rejected';
  rejectionReason?: string;
  appealNotes?: string;
  reviewedByUserId?: string;
  reviewedByUserName?: string;
  reviewedByNgoName?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface Complaint {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterRole: UserRole;
  targetId?: string;
  targetName?: string;
  category: 'Food Quality' | 'No Show Pickup' | 'Misbehavior' | 'Hygiene' | 'Other';
  description: string;
  city?: string;
  status: 'Pending' | 'Under_Investigation' | 'Resolved';
  adminNotes?: string;
  createdAt: string;
}

export interface PlatformSettings {
  distributionPeriodMode: 'Daily' | 'Weekly';
  maxMealsPerPeriodPerBeneficiary: number;
  defaultCountry: string;
  maxMatchingRadiusKm: number;
  availableProvinces: string[];
}

export interface PublicPlatformSettings {
  distributionPeriodMode: 'Daily' | 'Weekly';
  defaultCountry: string;
  availableProvinces: string[];
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  details: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}
