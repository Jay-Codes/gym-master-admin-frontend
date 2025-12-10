export interface AuthResponse {
  token: string;
  role: string;
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

export interface CreateUserRequest {
  name: string;
  email: string;
  password?: string;
  phoneNumber: string;
  role: string;
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