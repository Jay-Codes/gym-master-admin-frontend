import {
  ApiResponse, SuperAdmin, User, Company,
  CreateSuperAdminRequest, CreateUserRequest, CreateCompanyRequest,
  PageableResponse, ActivationRequest, UpdateMessagingRequest,
  SmsBalanceData, UpdateSmsBalanceRequest,
  BillingPlan, BillingAddon, PaymentInitiateRequest, PaymentHistory,
  CreatePlanRequest, KazafitInvoice, PartnerAnalytics, Partner, CommissionOverrideRequest,
  PartnerConfig, PartnerHistoryEntry, PartnerPaymentMethod,
  OnboardingStep, OnboardingData, OnboardingResponse,
  PartnerPayout, CreatePayoutRequest, UpdatePayoutStatusRequest,
  UpdatePlanRequest, PlanAudit
} from '../types';
import { clearSession, getOnboardingToken, getToken } from './session';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const ONBOARDING_PREFIX = '/api/v1/onboarding';

// Endpoints where a 401 is an answer, not an expired session. Signing these out
// would wipe the onboarding token mid-flow, or bounce a user off the login page
// for mistyping their password.
const isSessionExempt = (endpoint: string) =>
  endpoint.startsWith('/api/superadmin/auth/login') || endpoint.startsWith(ONBOARDING_PREFIX);

const getHeaders = (endpoint: string) => {
  const token = endpoint.startsWith(ONBOARDING_PREFIX)
    ? getOnboardingToken() ?? getToken()
    : getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

// The backend answers an expired or revoked token with 401 and
// errorCode TOKEN_EXPIRED. Without this the stale token stayed in localStorage,
// the router kept letting the user in, and every page just rendered its own error.
const handleUnauthorized = (endpoint: string) => {
  if (isSessionExempt(endpoint)) return;
  clearSession();
  if (typeof window !== 'undefined' && !window.location.hash.startsWith('#/login')) {
    window.location.hash = '/login';
  }
};

const request = async <T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...getHeaders(endpoint),
        ...options.headers,
      },
    });

    // Parse JSON. If response is empty (e.g. 204), this might fail,
    // but the docs suggest wrapped responses for most endpoints.
    // For DELETE, if it returns 200 OK with body, it works.
    const data = await response.json().catch(() => ({}));

    // Only 401. A 403 means the token authenticated but the authority check
    // failed — signing out just loops the user back through login.
    if (response.status === 401) {
      handleUnauthorized(endpoint);
    }

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error: any) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
};

// For public endpoints that return a plain JSON array (no auth, no ApiResponse wrapper)
const publicRequest = async <T>(endpoint: string): Promise<T> => {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }
    return data as T;
  } catch (error: any) {
    console.error(`Public API Error [${endpoint}]:`, error);
    throw error;
  }
};

export const api = {
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<{ token: string; role: string }>('/api/superadmin/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      }),
    logout: () =>
      request<null>('/api/superadmin/auth/logout', { method: 'POST' }),
    // Backend returns the role as a bare string in `data`, not an object.
    validate: () =>
      request<string>('/api/superadmin/auth/validate', { method: 'GET' })
  },

  superAdmin: {
    create: (data: CreateSuperAdminRequest) =>
      request<SuperAdmin>('/api/superadmin/create', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    list: async () => {
      const response = await request<any>('/api/superadmin/list', { method: 'GET' });
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        return response.data[0] as ApiResponse<SuperAdmin[]>;
      }
      throw new Error("Unexpected API response format for superadmin list");
    },
    get: (id: number) =>
      request<SuperAdmin>(`/api/superadmin/${id}`, { method: 'GET' }),
    update: (id: number, data: CreateSuperAdminRequest) =>
      request<SuperAdmin>(`/api/superadmin/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    toggleStatus: (id: number) =>
      request<SuperAdmin>(`/api/superadmin/${id}/toggle-status`, { method: 'PATCH' }),
    
    // Plan Management
    plans: {
      list: async () => {
        const response = await request<any>('/api/superadmin/plans', { method: 'GET' });
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          return response.data[0] as ApiResponse<BillingPlan[]>;
        }
        throw new Error("Unexpected API response format for plans list");
      },
      create: (data: CreatePlanRequest) =>
        request<BillingPlan>('/api/superadmin/plans', {
          method: 'POST',
          body: JSON.stringify(data)
        }),
      update: (id: string, data: Partial<CreatePlanRequest>) =>
        request<BillingPlan>(`/api/superadmin/plans/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        }),
      delete: (id: string) =>
        request<void>(`/api/superadmin/plans/${id}`, { method: 'DELETE' })
    },

    // Invoice Management
    invoices: {
      list: async (page = 0, size = 20) => {
        const response = await request<any>(`/api/superadmin/billing/invoices?page=${page}&size=${size}`, { method: 'GET' });
        // The API returns a wrapped response for superadmin: { data: [ { success: true, ..., data: { content: [...] } } ] }
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          return response.data[0] as ApiResponse<PageableResponse<KazafitInvoice>>;
        }
        throw new Error("Unexpected API response format for invoices list");
      },
    },

    // Partner Management
    partners: {
      getAnalytics: async (start?: string, end?: string) => {
        const query = start && end ? `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}` : '';
        const response = await request<any>(`/api/superadmin/partners/analytics${query}`, { method: 'GET' });
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          return response.data[0] as ApiResponse<PartnerAnalytics>;
        }
        return response as ApiResponse<PartnerAnalytics>;
      },
      getHistory: async (id: string, start?: string, end?: string) => {
        const query = start && end ? `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}` : '';
        const response = await request<any>(`/api/superadmin/partners/${id}/history${query}`, { method: 'GET' });
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          return response.data[0] as ApiResponse<PartnerHistoryEntry[]>;
        }
        return response as ApiResponse<PartnerHistoryEntry[]>;
      },
      getConfig: async () => {
        const response = await request<any>('/api/superadmin/partners/config', { method: 'GET' });
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          return response.data[0] as ApiResponse<PartnerConfig>;
        }
        if (response.success) {
          return response as ApiResponse<PartnerConfig>;
        }
        throw new Error("Unexpected API response format for partner config");
      },
      updateConfig: async (data: PartnerConfig) => {
        const response = await request<any>('/api/superadmin/partners/config', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          return response.data[0] as ApiResponse<PartnerConfig>;
        }
        if (response.success) {
          return response as ApiResponse<PartnerConfig>;
        }
        throw new Error("Unexpected API response format for partner config update");
      },
      list: async (page = 0, size = 20) => {
        const response = await request<any>(`/api/superadmin/partners?page=${page}&size=${size}`, { method: 'GET' });
        
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          const innerResponse = response.data[0] as ApiResponse<any>;
          // The inner data can be a PageableResponse or a direct array
          if (innerResponse.data && Array.isArray(innerResponse.data)) {
            // It's a direct array, wrap it in a mock PageableResponse for the DataTable
            return {
              ...innerResponse,
              data: {
                content: innerResponse.data,
                totalPages: 1,
                totalElements: innerResponse.data.length,
                size: innerResponse.data.length,
                number: 0
              }
            } as ApiResponse<PageableResponse<Partner>>;
          }
          return innerResponse as ApiResponse<PageableResponse<Partner>>;
        }

        // Fallback for different response formats
        if (response.success && response.data && 'content' in response.data) {
          return response as ApiResponse<PageableResponse<Partner>>;
        }
        throw new Error("Unexpected API response format for partners list");
      },
      updateCommission: (id: string, data: CommissionOverrideRequest) => {
        const query = `?rate=${data.rate}&type=${data.type}&schedule=${encodeURIComponent(data.schedule)}`;
        return request<Partner>(`/api/superadmin/partners/${id}/commission${query}`, {
          method: 'PUT'
        });
      },
      getPaymentMethods: async (id: string) => {
        const response = await request<any>(`/api/superadmin/partners/${id}/payment-methods`, { method: 'GET' });
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          // The API might double wrap or return direct. Based on previous patterns, we check if it's an array of responses.
          if (response.data[0]?.success !== undefined) {
             return response.data[0] as ApiResponse<PartnerPaymentMethod[]>;
          }
        }
        return response as ApiResponse<PartnerPaymentMethod[]>;
      },
      payouts: {
        list: async (start?: string, end?: string) => {
          const query = start && end ? `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}` : '';
          const response = await request<any>(`/api/superadmin/partners/payouts${query}`, { method: 'GET' });
          if (response.data && Array.isArray(response.data) && response.data.length > 0) {
            return response.data[0] as ApiResponse<PartnerPayout[]>;
          }
          return response as ApiResponse<PartnerPayout[]>;
        },
        create: (data: CreatePayoutRequest) =>
          request<PartnerPayout>('/api/superadmin/partners/payouts', {
            method: 'POST',
            body: JSON.stringify(data)
          }),
        updateStatus: (id: string, data: UpdatePayoutStatusRequest) =>
          request<PartnerPayout>(`/api/superadmin/partners/payouts/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify(data)
          })
      }
    }
  },

  users: {
    create: (companyId: number, data: CreateUserRequest) =>
      request<User>(`/api/superadmin/users/create?companyId=${companyId}`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    list: async (page = 0, size = 20) => {
      const response = await request<any>(`/api/superadmin/users?page=${page}&size=${size}`, { method: 'GET' });

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        return response.data[0] as ApiResponse<PageableResponse<User>>;
      }

      throw new Error("Unexpected API response format for users list");
    },
    toggleActivation: (id: number, reason: string) =>
      request<User>(`/api/superadmin/users/${id}/toggle-activation`, {
        method: 'PATCH',
        body: JSON.stringify({ reason })
      }),
    delete: (id: number) =>
      request<void>(`/api/superadmin/users/${id}`, { method: 'DELETE' }),
    status: (id: number) =>
      request<boolean>(`/api/superadmin/users/${id}/status`, { method: 'GET' })
  },

  companies: {
    create: (data: CreateCompanyRequest) =>
      request<Company>('/api/superadmin/companies/create', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: async (id: number, data: Partial<CreateCompanyRequest>) => {
      const payload = {
        company_name: data.companyName,
        company_email: data.companyEmail,
        tin: data.tin,
        description: data.description,
        address: data.address,
        phone: data.phone,
        website: data.website,
        founder: data.founder,
        manager: data.manager,
        account_name: data.accountName,
        account_number: data.accountNumber,
        is_sms_enabled: data.isSmsEnabled,
      };

      // Removing undefined fields to avoid sending nulls for unprovided data
      Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);

      return request<Company>(`/api/superadmin/companies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    },
    list: async (page = 0, size = 20, search = '', status = 'ALL') => {
      // The provided backend documentation does not include search or status filtering parameters for the list endpoint.
      // We only pass pagination parameters.
      const response = await request<any>(`/api/superadmin/companies?page=${page}&size=${size}`, { method: 'GET' });

      // The API returns a wrapped response: { data: [ { success: true, ... } ] }
      // We need to extract the first item from the data array which contains the actual ApiResponse
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        return response.data[0] as ApiResponse<PageableResponse<Company>>;
      }

      throw new Error("Unexpected API response format for companies list");
    },
    toggleActivation: (id: number, reason: string) =>
      request<Company>(`/api/superadmin/companies/${id}/toggle-activation`, {
        method: 'PATCH',
        body: JSON.stringify({ reason })
      }),
    updateMessaging: (id: number, data: UpdateMessagingRequest) =>
      request<Company>(`/api/superadmin/companies/${id}/messaging`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    delete: (id: number) =>
      request<void>(`/api/superadmin/companies/${id}`, { method: 'DELETE' }),
    status: (id: number) =>
      request<boolean>(`/api/superadmin/companies/${id}/status`, { method: 'GET' }),
    getSmsBalance: async (id: number) => {
      const response = await request<any>(`/api/superadmin/companies/${id}/sms-balance`, { method: 'GET' });
      if (response && Array.isArray(response.data) && response.data.length > 0) {
        return response.data[0] as ApiResponse<SmsBalanceData>;
      } else if (response && response.data && 'companyId' in (response as any).data) {
        return response as ApiResponse<SmsBalanceData>;
      }
      throw new Error("Unexpected API response format for getSmsBalance");
    },
    updateSmsBalance: async (id: number, data: UpdateSmsBalanceRequest) => {
      const response = await request<any>(`/api/superadmin/companies/${id}/sms-balance`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
      if (response && Array.isArray(response.data) && response.data.length > 0) {
        return response.data[0] as ApiResponse<SmsBalanceData>;
      } else if (response && response.data && 'companyId' in (response as any).data) {
        return response as ApiResponse<SmsBalanceData>;
      }
      throw new Error("Unexpected API response format for updateSmsBalance");
    },
    updateCompanyPlan: (companyId: number, data: UpdatePlanRequest) =>
      request<Company>(`/api/superadmin/companies/${companyId}/plan`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    getPlanAudits: async (companyId: number) => {
      const response = await request<any>(`/api/superadmin/companies/${companyId}/plan-audits`, { method: 'GET' });
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        return response.data[0] as ApiResponse<PlanAudit[]>;
      }
      return response as ApiResponse<PlanAudit[]>;
    },
    updateOnboardingStatus: (companyId: number, onboardingStep: OnboardingStep) =>
      request<void>(`/api/superadmin/companies/${companyId}/onboarding-status`, {
        method: 'PATCH',
        body: JSON.stringify({ onboarding_step: onboardingStep })
      }),
  },

  billing: {
    // Public endpoints — no auth required, respond with a plain array
    getPlans: () =>
      publicRequest<BillingPlan[]>('/api/billing/plans'),
    getAddons: () =>
      publicRequest<BillingAddon[]>('/api/billing/addons'),
    // Authenticated endpoints
    getCompanyPlan: (companyId: number) =>
      request<BillingPlan>(`/api/billing/plan/${companyId}`, { method: 'GET' }),
    initiatePayment: (data: PaymentInitiateRequest) =>
      request<{ redirectUrl?: string; message?: string }>('/api/billing/payments/initiate', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    getPaymentHistory: (companyProfileId?: number) =>
      request<PaymentHistory[]>(`/api/billing/payments${companyProfileId ? `?companyProfileId=${companyProfileId}` : ''}`, { method: 'GET' }),
    getInvoices: (companyProfileId?: number) =>
      request<KazafitInvoice[]>(`/api/billing/invoices${companyProfileId ? `?companyProfileId=${companyProfileId}` : ''}`, { method: 'GET' })
  },
  
  onboarding: {
    requestEmailOtp: (email: string) =>
      request<{ success: boolean; message: string }>('/api/v1/onboarding/request-email-otp', {
        method: 'POST',
        body: JSON.stringify({ email })
      }),
    confirmEmailOtp: (email: string, otp: string) =>
      request<{ success: boolean; message: string }>('/api/v1/onboarding/confirm-email-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp })
      }),
    createPassword: (email: string, password: string) =>
      request<{ success: boolean; message: string }>('/api/v1/onboarding/password-creation', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }),
    companyStep1: (data: { userEmail: string; companyName: string; subDomain: string; companyEmail: string; tin: string; phone: string }) =>
      request<OnboardingData>('/api/v1/onboarding/company-step-1', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    updateCompanyDetails: (data: { logo?: string; address: string; website: string }) =>
      request<{ success: boolean; message: string }>('/api/v1/onboarding/company-details', {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    requestPhoneOtp: () =>
      request<{ success: boolean; message: string }>('/api/v1/onboarding/request-phone-otp', {
        method: 'POST'
      }),
    confirmPhoneOtp: (otp: string) =>
      request<{ success: boolean; message: string }>('/api/v1/onboarding/confirm-phone-otp', {
        method: 'POST',
        body: JSON.stringify({ otp })
      })
  }
};