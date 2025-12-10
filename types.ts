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
  active: boolean; // Inferred from toggle status endpoint
}

export interface User {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  active: boolean;
  companyId?: number; // Depending on backend response
}

export interface Company {
  id: number;
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
  active: boolean; // Inferred
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