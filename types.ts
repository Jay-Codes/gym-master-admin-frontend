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
  // Null on SMS credit invoices (and add-on-only invoices): there is no plan.
  planId: string | null;
  planName: string | null;
  planCode: string | null;
  /** `monthly` / `yearly` / ...; `once` on SMS credit invoices. */
  period: string;
  amountTzs: number;
  status: string;
  issuedAt: string;
  dueAt: string;
  nextPaymentAt: string;
  paidAt: string | null;
  addons: KazafitAddon[];
  // S2-T2 / S2-T3 additive fields (backend KazafitInvoiceResponse). Older payloads may omit them.
  /** `SUBSCRIPTION` or `SMS_CREDITS`. */
  kind?: KazafitInvoiceKind | string | null;
  smsCredits?: number | null;
  unitRateTzs?: number | null;
  subtotalTzs?: number | null;
  vatRatePercent?: number | null;
  vatTzs?: number | null;
  /** Set when a superadmin reversed the SMS purchase; the invoice is then `void`. */
  reversedAt?: string | null;
}

export type KazafitInvoiceKind = 'SUBSCRIPTION' | 'SMS_CREDITS';

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
// --- SMS credits: pricing, purchases, sender IDs (S2-T6) ---
// Pricing, override and purchase types match the shipped backend (S2-T1 / S2-T3; reconciled in
// S2-T6a). Sender ID types below are still the plan § 10 assumption: S3-T1 is not built yet.

/** Field-level validation messages from a 400 (`Response.errors`): {field: [message]}. */
export type FieldErrors = Record<string, string[]>;

/**
 * The backend's `PagedResponse` (com.jerrycode.gym_services.response.PagedResponse) — not the
 * Spring page shape of `PageableResponse`. `currentPage` is 0-based.
 */
export interface PagedResponse<T> {
  content: T[];
  currentPage: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/** Shipped limits (SmsPricingService validation). Client hints mirror them; the server decides. */
export const SMS_PRICING_LIMITS = {
  rateTzs: { min: 1, max: 100000 },
  vatRatePercent: { min: 0, max: 100 },   // at most 2 decimals
  minCredits: { min: 1, max: 1000000 },
  overrideNoteMax: 500,
  reversalReasonMax: 500,
} as const;

/** Platform SMS pricing. Rate is TZS per credit, exclusive of VAT (D9). */
export interface SmsPricingSettings {
  rateTzs: number;
  /** Percentage, e.g. 18.00 means 18%. */
  vatRatePercent: number;
  minCredits: number;
  /** Superadmin label of the last change; null until first changed. */
  updatedBy: string | null;
  /** ISO-8601 instant (UTC). */
  updatedAt: string | null;
}

/** PUT body: null leaves a field unchanged. */
export interface UpdateSmsPricingRequest {
  rateTzs: number | null;
  vatRatePercent: number | null;
  minCredits: number | null;
}

/** Per-gym rate override. Replaces the platform rate for this gym only; VAT and minimum still apply. */
export interface SmsPricingOverride {
  companyId: number;
  rateTzs: number;
  note: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

/** PUT body: rateTzs required (1..100000); note optional, ≤500, blank → null server-side. */
export interface SetSmsPricingOverrideRequest {
  rateTzs: number;
  note?: string | null;
}

/** The payment's own status, lower case. A reversed purchase stays `completed` with `reversedAt` set. */
export type SmsPurchaseStatus = 'pending' | 'completed' | 'failed' | 'voided' | 'expired' | 'cancelled';

/**
 * One SMS credit purchase (backend `SmsCreditPurchaseResponse`). Price fields are frozen at
 * initiation, whole TZS. Timestamps are ISO-8601 with the +03:00 offset, or null. `invoiceNumber`
 * is `INV-XXXXXXXX` once completed. `reversedBy` is the reversing superadmin's email.
 */
export interface SmsPurchase {
  paymentId: string;
  companyId: number;
  companyName: string | null;
  credits: number;
  unitRateTzs: number | null;
  subtotalTzs: number | null;
  vatRatePercent: number | null;
  vatTzs: number | null;
  totalTzs: number;
  status: SmsPurchaseStatus | string;
  invoiceNumber: string | null;
  createdAt: string;
  paidAt: string | null;
  reversedAt: string | null;
  reversedBy: string | null;
  reversalReason: string | null;
}

/**
 * Status filter values the list accepts (case-insensitive): `reversed` = reversed at any time;
 * `completed` = completed and not reversed; `failed` = failed, voided, expired or cancelled;
 * the rest match exactly. Anything else is a 400.
 */
/**
 * Result of `POST /api/superadmin/sms-purchases/{paymentId}/check-with-snippe`.
 * 200 → `updated`: data is the purchase row after the check (completed + credited if Snippe says paid).
 * 202 → `still`: Snippe does not report the payment as completed; `snippeStatus` is its status.
 */
export type CheckWithSnippeResult =
  | { kind: 'updated'; purchase: SmsPurchase; message: string | null }
  | { kind: 'still'; snippeStatus: string | null; message: string | null };

export type SmsPurchaseStatusFilter = 'completed' | 'pending' | 'failed' | 'reversed' | 'voided' | 'expired' | 'cancelled';

export interface SmsPurchaseFilters {
  companyId?: number;
  from?: string;   // YYYY-MM-DD, inclusive EAT calendar day
  to?: string;     // YYYY-MM-DD, inclusive EAT calendar day
  status?: SmsPurchaseStatusFilter;
  page?: number;   // 0-based
  size?: number;   // server clamps to 1..100
}

export type SenderIdStatus = 'ACTIVE' | 'DISABLED';

/**
 * An approved sender ID, as `GET /api/superadmin/companies/{companyId}/sender-ids` returns it
 * (S3-T1 `SenderIdResponse`). Registration with Beem/TCRA happens offline (D1).
 * `createdBy` is the superadmin's email; timestamps are `LocalDateTime` (no offset).
 */
export interface CompanySenderId {
  id: number;
  companyId: number;
  senderName: string;
  status: SenderIdStatus;
  isDefault: boolean;
  notes: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * `senderName` must match `^[A-Za-z0-9]{1,11}$` after trim and must not be "Growsoft" (any case).
 * `status` defaults to ACTIVE, `isDefault` to false; default + DISABLED is refused (400). notes ≤ 500.
 */
export interface CreateSenderIdRequest {
  senderName: string;
  status?: SenderIdStatus;
  isDefault?: boolean;
  notes?: string | null;
}

/** Partial: absent/null = unchanged; blank `notes` clears them. */
export interface UpdateSenderIdRequest {
  status?: SenderIdStatus;
  isDefault?: boolean;
  notes?: string | null;
}
