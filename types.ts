// COMPANY_DETAILS and PHONE_VERIFICATION were retired in V47: those fields moved
// to the Business Profile screen and phones are verified on first SMS use.
// OTP_CONFIRMATION is a client-only view, not a server-side step.
export type OnboardingStep =
  | 'EMAIL_VERIFICATION'
  | 'OTP_CONFIRMATION'
  | 'PASSWORD_CREATION'
  | 'COMPANY_STEP_1'
  | 'COMPLETED';

export interface AuthResponse {
  token: string;
  role: string;
  onboarding_step?: OnboardingStep;
  // Add other metadata fields if returned by API
}

export interface SuperAdmin {
  id: number;
  username: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin: string;
  enabled: boolean;
  authorities: { authority: string }[];
  accountNonExpired: boolean;
  accountNonLocked: boolean;
  credentialsNonExpired: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  password?: string;
  image: string | null;

  // Status & Timestamps
  isActivated: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  activatedAt: string;
  deactivatedAt: string | null;
  deactivationReason: string | null;

  // Onboarding / verification
  onboardingStep?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  acceptedTC?: boolean;

  // Auth & Security
  username: string;
  authorities: { authority: string }[];
  accountNonExpired: boolean;
  accountNonLocked: boolean;
  credentialsNonExpired: boolean;

  // Relations
  companyProfile: Company;
}

export interface Company {
  id: number;
  logo: string | null;
  companyName: string;
  subDomain: string;
  companyEmail: string;
  tin: string;
  description: string;
  address: string;
  phone: string;
  website: string;
  founder: string;
  manager: string;
  accountName: string;
  accountNumber: string;
  preferredLanguage: string;
  messageStatus: string;
  isSmsEnabled: boolean;
  smsEnabled: boolean;
  smsCount: number;
  remainingSmsCount: number;
  membersCurrentTotalCredits: number;
  companySenderId: string | null;
  smsPackageName: string;
  smsPackageProviderName: string;

  // Subscription fields
  companySubscriptionStartDate: string | null;
  companySubscriptionEndDate: string | null;
  expiryDate: string;

  // Timestamps & Status
  createdAt: string;
  updatedAt: string;
  isActivated: boolean;
  activatedAt: string;
  deactivatedAt: string | null;
  deactivationReason: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  token?: string; // Some responses include a JWT token
}

export interface PageableResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number; // current page
}

// Request Types
export interface CreateSuperAdminRequest {
  username: string;
  email: string;
  password?: string; // Optional on update
  fullName: string;
  phoneNumber: string;
}

export type UserRole = 'admin' | 'user' | 'USER_ROLE' | 'STAFF' | 'MEMBER' | 'ADMINISTRATOR' | 'MANAGER';

export interface CreateUserRequest {
  name: string;
  email: string;
  password?: string;
  phone_number: string;
  role: UserRole;
}

export interface ActivationRequest {
  reason: string;
}

export interface CreateCompanyRequest {
  companyName: string;
  subDomain: string;
  companyEmail: string;
  tin: string;
  description: string;
  address: string;
  phone: string;
  website: string;
  founder: string;
  manager: string;
  accountName: string;
  accountNumber: string;
  preferredLanguage: string;
  messageStatus: string;
  isSmsEnabled: boolean;
  subscriptionMonths: number;
}

export interface UpdateMessagingRequest {
  messageStatus?: 'enabled' | 'disabled';
  isSmsEnabled?: boolean;
}

export interface SmsBalanceData {
  companyId: number;
  companyName: string;
  previousBalance: number;
  newBalance: number;
}

export interface UpdateSmsBalanceRequest {
  amount: number;
  operation: 'ADD' | 'SUBTRACT' | 'SET';
}

export interface BillingPlan {
  id: string;
  name: string;
  code: string;
  description: string;
  monthlyPriceTzs?: number;
  annualPriceTzs?: number;
  trialDays: number;
  active: boolean;
  isActive?: boolean; // Keep for internal form state if needed
  createdAt?: string;
}

export interface CreatePlanRequest {
  name: string;
  code: string;
  description: string;
  monthlyPriceTzs: number;
  annualPriceTzs: number;
  trialDays: number;
  active: boolean;
}

export interface UpdatePlanRequest {
  planId: string;
  expiresAt: string;
  renewalAt: string;
  reason: string;
}

export interface PlanAudit {
  id: number;
  companyId: number;
  adminId: number;
  oldPlanId: string;
  newPlanId: string;
  oldExpiresAt: string;
  newExpiresAt: string;
  oldRenewalAt: string;
  newRenewalAt: string;
  reason: string;
  createdAt: string;
}

export interface BillingAddon {
  id: string;
  name: string;
  code: string;
  description: string;
  monthlyPriceTzs?: number;
  annualPriceTzs?: number;
  active: boolean;   // API returns 'active', not 'isActive'
  createdAt?: string;
}

export interface PaymentInitiateRequest {
  companyProfileId?: number;
  planId: string;
  addonIds?: string[];
  billingPeriod: 'monthly' | 'annually';
  paymentType: 'mobile' | 'card';
  phoneNumber?: string;
  activationCode?: string;
}

export interface PaymentHistory {
  id: string;
  amount: number;
  status: string;
  paymentType: string;
  billingPeriod: string;
  createdAt: string;
  companyName?: string;
}

export interface KazafitAddon {
  id: string;
  name: string;
  amountTzs: number;
}

export interface KazafitInvoice {
  id: string;
  companyProfileId: number;
  companyName: string;
  planId: string;
  planName: string;
  planCode: string;
  period: string;
  amountTzs: number;
  status: string;
  issuedAt: string;
  dueAt: string;
  nextPaymentAt: string;
  paidAt: string | null;
  addons: KazafitAddon[];
}

export interface PartnerAnalytics {
  partnersCount: number;
  totalPartners: number;
  totalReferralsInPeriod: number;
  totalIncomeInPeriod: number;
}

export interface Partner {
  id: string;
  activationCode: string;
  referrerName: string;
  referrerEmail: string;
  referrerPhone: string;
  businessName: string;
  idType: string | null;
  idNumber: string | null;
  idDocumentUrl: string | null;
  commissionRate: number;
  commissionType: 'flat' | 'percent';
  totalReferrals: number;
  totalCommissionTzs: number;
  kycStatus: string;
  userId: number;
  payoutSchedule: string;
  onboardingStatus: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
  paidCommissionTzs: number;
  // Legacy fields for compatibility if needed (can be removed once UI is updated)
  name?: string;
  email?: string;
  referralCount?: number;
  totalEarned?: number;
  status?: string;
  commissionSchedule?: string;
}

export interface OnboardingData {
  id: number;
  email: string;
  onboarding_step: OnboardingStep;
  companyId?: number;
}

export interface OnboardingResponse extends ApiResponse<OnboardingData> {
  token?: string;
}

export interface CommissionOverrideRequest {
  rate: number;
  type: 'flat' | 'percent';
  schedule: string;
}

export interface PartnerConfig {
  defaultCommissionRate: number;
  defaultCommissionType: 'flat' | 'percent';
  defaultPayoutSchedule: string;
}

export interface PartnerHistoryEntry {
  id: number;
  partnerId: string;
  referralsCount: number;
  incomeGeneratedTzs: number;
  recordedAt: string;
  // legacy for compatibility
  date?: string;
  referrals?: number;
  income?: number;
  status?: string;
}

export interface PartnerPaymentMethod {
  id: string;
  partnerId: string;
  type: string;
  provider: string;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
}

export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface PartnerPayout {
  id: string;
  partnerId: string;
  partnerName?: string;
  amount: number;
  paymentMethodId: string;
  status: PayoutStatus;
  reference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePayoutRequest {
  partnerId: string;
  amount: number;
  paymentMethodId: string;
  notes?: string;
}

export interface UpdatePayoutStatusRequest {
  status: PayoutStatus;
  reference?: string;
}

export interface BackfillPreviewMonth {
  month: string;           // "yyyy-MM"
  eligibleCount: number;
  eligibleAmount: number;
  alreadyInvoicedCount: number;
  blockedCount: number;
  blockedMemberIds: number[];
}

export interface BackfillPreview {
  companyId: number;
  from: string;
  to: string;
  months: BackfillPreviewMonth[];
  totalEligibleCount: number;
  totalEligibleAmount: number;
  totalAlreadyInvoicedCount: number;
  totalBlockedCount: number;
  blockedMemberIds: number[];
  coverageRatio: number;   // alreadyInvoiced / (alreadyInvoiced + eligible + blocked), 0 when empty
}

export interface BackfillRun {
  runId: number;
  companyId: number;
  performedBy: string;
  windowFrom: string;
  windowTo: string;
  rowsInserted: number;
  amountInserted: number;
  firstInvoiceId: number | null;
  lastInvoiceId: number | null;
  status: string;          // 'COMPLETED' | 'ROLLED_BACK'
  hasMore: boolean;        // eligible population exceeded the 10,000-row per-run cap
  createdAt: string;
  rolledBackAt: string | null;
  rolledBackBy: string | null;
}

// --- Gymless portal login: platform-funded OTP ---
// Growsoft pays for OTP SMS on the gymless login path (a member who opens the
// portal without their gym's QR link). Gyms pay for everything else, so nothing
// here is a gym-billable figure.

export interface PortalOtpSettings {
  /** TZS charged per SMS credit. Stamped onto each ledger row at time of send. */
  smsUnitCostTzs: number;
  /** Max gymless OTP sends per phone number per day. Counted across both paths. */
  perPhoneDaily: number;
  /** Max gymless OTP sends per client IP per day. */
  perIpDaily: number;
  /** Max gymless OTP sends per client IP per hour. */
  perIpHourly: number;
  /** false = the IP caps are recorded but never block. Ships false on purpose. */
  ipCapsEnforced: boolean;
  /** The kill switch. false = no one can sign in without a gym QR or link. */
  gymlessLoginEnabled: boolean;
}

// --- Member portal capability, per gym (P-1 / P-6) ---
// The outermost gate of the member portal. Superadmin-only, a commercial
// decision of the same shape as `isSmsEnabled` / `messageStatus` on Company.
// Distinct from the gym admin's own PortalSettings (self-signup, approval,
// attendance visibility...), which configure a portal this flag must first allow
// to exist at all. Default is off: a gym that has never been switched on here
// has no member portal.
//
// The request field is `enabled` and the response field is `portalEnabled`.
// That asymmetry is the agreed contract, not an oversight — do not "tidy" it.

export interface PortalAccessRequest {
  /** The state to move the gym to. */
  enabled: boolean;
}

export interface PortalAccessStatus {
  /** Whether this gym is currently allowed to use the member portal. */
  portalEnabled: boolean;
}

export interface PortalOtpSpendDay {
  date: string;       // YYYY-MM-DD, bucketed Africa/Dar_es_Salaam
  sends: number;
  credits: number;
  costTzs: number;
}

export interface PortalOtpSpendGym {
  // Nullable defensively: the ledger's company_id is nullable, so a send with no
  // resolved gym is representable even though the membership pre-check should
  // always produce one.
  companyId: number | null;
  companyName: string | null;
  sends: number;
  credits: number;
  costTzs: number;
}

export interface PortalOtpSpend {
  totalSends: number;
  totalVerified: number;
  totalCredits: number;
  totalCostTzs: number;
  byDay: PortalOtpSpendDay[];
  byGym: PortalOtpSpendGym[];
}

// NOTE: there is deliberately no `conversionRate` here. An earlier draft of the contract
// carried one, but its unit was never defined — `0.62` and `62` are both plausible readings
// and `1` is ambiguous under either — so the backend dropped it rather than ship a number
// nobody could safely interpret. The UI divides `totalVerified / totalSends` itself.
// Do not re-add it: a declared field the server never sends reads as `undefined` at runtime
// while type-checking clean, which is the worst of both.

export interface RunBackfillRequest {
  companyId: number;
  from: string;
  to: string;
  confirm: boolean;
  force: boolean;
}