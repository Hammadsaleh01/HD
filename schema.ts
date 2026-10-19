import type {
  User,
  FoodListing,
  AssistanceCase,
  FoodAllocation,
  FoodDistribution,
  FinancialDonation,
  CampaignExpense,
  NgoCampaign,
  BeneficiaryApplication,
  Complaint,
  PlatformSettings,
  AuditLog,
  Notification
} from '@shared/types.ts';

export interface DatabaseSchema {
  users: User[];
  listings: FoodListing[];
  assistanceCases: AssistanceCase[];
  allocations: FoodAllocation[];
  distributions: FoodDistribution[];
  financialDonations: FinancialDonation[];
  campaignExpenses: CampaignExpense[];
  campaigns: NgoCampaign[];
  beneficiaryApplications: BeneficiaryApplication[];
  complaints: Complaint[];
  platformSettings: PlatformSettings;
  auditLogs: AuditLog[];
  notifications: Notification[];
}

export type {
  User,
  FoodListing,
  AssistanceCase,
  FoodAllocation,
  FoodDistribution,
  FinancialDonation,
  CampaignExpense,
  NgoCampaign,
  BeneficiaryApplication,
  Complaint,
  PlatformSettings,
  AuditLog,
  Notification
};
