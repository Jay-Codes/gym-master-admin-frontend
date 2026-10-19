import {
  ApiResponse, SuperAdmin, User, Company,
  CreateSuperAdminRequest, CreateUserRequest, CreateCompanyRequest,
  PageableResponse, ActivationRequest, UpdateMessagingRequest,
  SmsBalanceData, UpdateSmsBalanceRequest,
  BillingPlan, BillingAddon, PaymentInitiateRequest, PaymentHistory,
  CreatePlanRequest, KazafitInvoice, PartnerAnalytics, Partner, CommissionOverrideRequest,
  PartnerConfig, PartnerHistoryEntry, PartnerPaymentMethod, KycDecision,
  OnboardingStep, OnboardingData, OnboardingResponse,
  PartnerPayout, CreatePayoutRequest, UpdatePayoutStatusRequest,
  UpdatePlanRequest, PlanAudit,
  BackfillPreview, BackfillRun, RunBackfillRequest,
  PortalOtpSettings, PortalOtpSpend, PasswordPolicySettings,
  PortalAccessRequest, PortalAccessStatus,
  SmsPricingSettings, UpdateSmsPricingRequest, SmsPricingOverride, SetSmsPricingOverrideRequest, PagedResponse,
  SmsPurchase, SmsPurchaseFilters, CheckWithSnippeResult,
  CompanySenderId, CreateSenderIdRequest, UpdateSenderIdRequest,
  PlatformPaymentPreview, RecordPlatformPaymentRequest, PlatformPaymentResult,
  NotificationPrefs, UpdateNotificationPrefsRequest,
  PlanNotificationSettings, PlanNotificationTemplate, PlanNotificationPreview, PlanNotificationTestSendResult,
  PlanUpcomingResult, PlanLogRow, PlanLogFilters, PlanSmsStats, PlanExpiryStats
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
      // `status` lets a caller tell "not there" (404) from a real failure.
      const err: any = new Error(data.message || `Request failed with status ${response.status}`);
      err.status = response.status;
      // Field-level validation messages (`Response.errors`: {field: [message]}), when present.
      const fieldErrors = data?.errors ?? (Array.isArray(data?.data) ? data.data[0]?.errors : undefined);
      if (fieldErrors && typeof fieldErrors === 'object') err.errors = fieldErrors;
      throw err;
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

/**
 * Unwrap the superadmin controller's `ResponseWrapper`.
 *
 * That wrapper nests the real `Response` inside a single-element `data` array, so a caller that
 * reads `res.success` or `res.data.someField` straight off the parsed body is testing `undefined`
 * against an array and fails every time — silently, because the shape is still valid JSON. Most
 * calls in this file already unwrap inline; this exists so the ones added later do it the same way
 * rather than each rediscovering the convention.
 *
 * Falls back to the response itself when it is not wrapped, because a few superadmin endpoints
 * return the flat shape. Deliberately does not throw: callers decide what an unreadable response
 * means, and for the portal toggle that decision is to show "state unknown" rather than to guess.
 */
const unwrapSuperAdminResponse = <T,>(response: any): ApiResponse<T> => {
  if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
    return response.data[0] as ApiResponse<T>;
  }
  return response as ApiResponse<T>;
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
      list: async (page = 0, size = 20, companyId?: number) => {
        const companyQuery = companyId != null ? `&companyId=${companyId}` : '';
        const response = await request<any>(`/api/superadmin/billing/invoices?page=${page}&size=${size}${companyQuery}`, { method: 'GET' });
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
      // KZ-47: superadmin KYC decision. Accepts the wrapped (`{data:[Response]}`) or flat
      // `Response` envelope and returns the updated partner.
      updateKyc: async (id: string, status: KycDecision): Promise<Partner> => {
        const response = await request<any>(`/api/superadmin/partners/${encodeURIComponent(id)}/kyc`, {
          method: 'PUT',
          body: JSON.stringify({ status })
        });
        const inner: any = Array.isArray(response?.data) ? response.data[0] : response;
        if (inner && inner.success === false) throw new Error(inner.message || 'Failed to update KYC status');
        return (inner?.data ?? {}) as Partner;
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
    },

    // KZ-01 grace: let the retired shared staff password log in with a warning until a date.
    passwordPolicy: {
      // Bare DTO (not the Response envelope), like the portal OTP settings.
      get: async () =>
        (await request<any>('/api/superadmin/password-policy', { method: 'GET' })) as unknown as PasswordPolicySettings,
      update: async (data: { mode: 'REFUSE' | 'WARN'; warnUntil: string | null }) =>
        (await request<any>('/api/superadmin/password-policy', {
          method: 'PUT',
          body: JSON.stringify(data)
        })) as unknown as PasswordPolicySettings,
    },

    // Gymless portal login — platform-funded OTP. Growsoft pays for these sends,
    // so nothing here debits a gym.
    portalOtp: {
      getSettings: async () => {
        const response = await request<any>('/api/superadmin/portal-otp-settings', { method: 'GET' });
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          return response.data[0] as ApiResponse<PortalOtpSettings>;
        }
        return response as ApiResponse<PortalOtpSettings>;
      },
      updateSettings: async (data: PortalOtpSettings) => {
        const response = await request<any>('/api/superadmin/portal-otp-settings', {
          method: 'PUT',
          body: JSON.stringify(data)
        });
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          return response.data[0] as ApiResponse<PortalOtpSettings>;
        }
        return response as ApiResponse<PortalOtpSettings>;
      },
      // from/to are calendar dates (YYYY-MM-DD), bucketed Africa/Dar_es_Salaam server-side.
      getSpend: async (from: string, to: string) => {
        const query = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
        const response = await request<any>(`/api/superadmin/portal-otp-spend${query}`, { method: 'GET' });
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          return response.data[0] as ApiResponse<PortalOtpSpend>;
        }
        return response as ApiResponse<PortalOtpSpend>;
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

    // Member portal capability — the outermost gate of the member portal, off by
    // default. The request carries `enabled`, the response answers `portalEnabled`;
    // the asymmetry is the agreed contract and is deliberate.
    // Both calls go through unwrapSuperAdminResponse: this controller answers with
    // ResponseWrapper, which buries the real Response one level down inside a
    // single-element `data` array, exactly like every other superadmin endpoint here.
    getPortalAccess: async (companyId: number) => {
      const response = await request<any>(`/api/superadmin/companies/${companyId}/portal-access`, {
        method: 'GET'
      });
      return unwrapSuperAdminResponse<PortalAccessStatus>(response);
    },
    // The PATCH response body is not relied on: callers apply the value they asked
    // for on success. A 2xx here means the write landed — request() throws otherwise.
    // Unwrapped anyway so the two calls cannot drift into different shapes.
    updatePortalAccess: async (companyId: number, enabled: boolean) => {
      const payload: PortalAccessRequest = { enabled };
      const response = await request<any>(`/api/superadmin/companies/${companyId}/portal-access`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      return unwrapSuperAdminResponse<PortalAccessStatus>(response);
    },
  },

  // SMS credits: platform pricing, per-gym override, purchases/reversal, sender IDs (S2-T6).
  // Pricing, override and purchases are aligned with the shipped backend (S2-T1 / S2-T3, see
  // run/S2-T6a.md): flat `Response` envelope, list `data` is a `PagedResponse`. A 400 carries
  // `err.errors` ({field: [message]}) for inline field errors. Sender IDs follow S3-T1 as shipped
  // (run/S2-T6c.md).
  smsAdmin: {
    getPricing: async () =>
      unwrapSuperAdminResponse<SmsPricingSettings>(
        await request<any>('/api/superadmin/sms-pricing', { method: 'GET' })),
    // null fields are left unchanged server-side; nothing is saved if any field is invalid (400).
    updatePricing: async (data: UpdateSmsPricingRequest) =>
      unwrapSuperAdminResponse<SmsPricingSettings>(
        await request<any>('/api/superadmin/sms-pricing', { method: 'PUT', body: JSON.stringify(data) })),

    // 200 with data: null when the gym has no override. 404 means the company does not exist.
    getPricingOverride: async (companyId: number) =>
      unwrapSuperAdminResponse<SmsPricingOverride | null>(
        await request<any>(`/api/superadmin/companies/${companyId}/sms-pricing-override`, { method: 'GET' })),
    setPricingOverride: async (companyId: number, data: SetSmsPricingOverrideRequest) =>
      unwrapSuperAdminResponse<SmsPricingOverride>(
        await request<any>(`/api/superadmin/companies/${companyId}/sms-pricing-override`, {
          method: 'PUT', body: JSON.stringify(data)
        })),
    // Idempotent: 200 with data: null whether or not an override existed.
    deletePricingOverride: async (companyId: number) =>
      unwrapSuperAdminResponse<null>(
        await request<any>(`/api/superadmin/companies/${companyId}/sms-pricing-override`, { method: 'DELETE' })),

    // 400 on a malformed date, from > to, or an unknown status.
    listPurchases: async (filters: SmsPurchaseFilters = {}) => {
      const params = new URLSearchParams();
      if (filters.companyId) params.set('companyId', String(filters.companyId));
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.status) params.set('status', filters.status);
      params.set('page', String(filters.page ?? 0));
      params.set('size', String(filters.size ?? 20));
      return unwrapSuperAdminResponse<PagedResponse<SmsPurchase>>(
        await request<any>(`/api/superadmin/sms-purchases?${params.toString()}`, { method: 'GET' }));
    },
    // Debits the full purchased credits; the gym's balance may go negative. Money refund is offline.
    // 200 data = the reversed row. 409 already reversed / not completed; 400 not an SMS purchase or
    // bad reason; 404 unknown payment.
    reversePurchase: async (paymentId: string, reason: string) =>
      unwrapSuperAdminResponse<SmsPurchase>(
        await request<any>(`/api/superadmin/sms-purchases/${encodeURIComponent(paymentId)}/reverse`, {
          method: 'POST', body: JSON.stringify({ reason })
        })),
    // Asks Snippe for the real status of a purchase still `pending` (> 10 min old) and, if paid,
    // fulfils it through the same webhook fulfilment path (credits + invoice). No body.
    // 200 data = the updated purchase row; 202 data = {snippeStatus} (not paid yet).
    // request() does not expose the HTTP status of a success, so 200 vs 202 is told apart by shape:
    // a row carries `paymentId`. Errors throw with err.status: 409 not pending, 404 unknown payment,
    // 403 not a superadmin, 502 Snippe unreachable.
    checkWithSnippe: async (paymentId: string): Promise<CheckWithSnippeResult> => {
      const res = unwrapSuperAdminResponse<any>(
        await request<any>(`/api/superadmin/sms-purchases/${encodeURIComponent(paymentId)}/check-with-snippe`, {
          method: 'POST'
        }));
      const data = res?.data;
      const message = typeof res?.message === 'string' ? res.message : null;
      if (data && typeof data === 'object' && typeof data.paymentId === 'string') {
        return { kind: 'updated', purchase: data as SmsPurchase, message };
      }
      const snippeStatus = data && typeof data === 'object' && data.snippeStatus != null ? String(data.snippeStatus) : null;
      return { kind: 'still', snippeStatus, message };
    },

    // Flat `Response` whose `data` is the array itself (both statuses, id order). Not passed through
    // unwrapSuperAdminResponse: that helper would take a non-empty data array for the old
    // ResponseWrapper and return the first sender row instead of the response. 404 unknown gym.
    listSenderIds: async (companyId: number): Promise<ApiResponse<CompanySenderId[]>> => {
      const res = await request<any>(`/api/superadmin/companies/${companyId}/sender-ids`, { method: 'GET' });
      const first = Array.isArray(res?.data) ? res.data[0] : undefined;
      const isWrapper = first && typeof first === 'object' && 'success' in first && !('senderName' in first);
      return (isWrapper ? first : res) as ApiResponse<CompanySenderId[]>;
    },
    // 201 data = the new row. 400 errors.senderName|status|isDefault|notes; 409 errors.senderName
    // (duplicate in this gym, ignoring case); 404 unknown gym.
    createSenderId: async (companyId: number, data: CreateSenderIdRequest) =>
      unwrapSuperAdminResponse<CompanySenderId>(
        await request<any>(`/api/superadmin/companies/${companyId}/sender-ids`, {
          method: 'POST', body: JSON.stringify(data)
        })),
    // Partial {status?, isDefault?, notes?}. 200 data = the row. Setting a default clears the previous
    // one; disabling the default clears it (gym falls back to Growsoft) — callers re-read the list.
    // 400 errors.isDefault when making a DISABLED sender default; 404 sender not in this gym.
    updateSenderId: async (companyId: number, senderId: number, data: UpdateSenderIdRequest) =>
      unwrapSuperAdminResponse<CompanySenderId>(
        await request<any>(`/api/superadmin/companies/${companyId}/sender-ids/${senderId}`, {
          method: 'PATCH', body: JSON.stringify(data)
        })),
    // DELETE removes the row for good. 200 data = the removed row. Deleting the default clears the default (the gym
    // falls back to Growsoft); a campaign still waiting to send with it goes out from the default instead.
    // 404 sender not in this gym (already gone).
    deleteSenderId: async (companyId: number, senderId: number) =>
      unwrapSuperAdminResponse<CompanySenderId>(
        await request<any>(`/api/superadmin/companies/${companyId}/sender-ids/${senderId}`, {
          method: 'DELETE'
        })),
  },

  backfill: {
    preview: (companyId: number, from: string, to: string) =>
      request<BackfillPreview>(`/api/superadmin/maintenance/invoice-backfill/preview?companyId=${companyId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
        method: 'GET'
      }),
    run: (data: RunBackfillRequest) =>
      request<BackfillRun>('/api/superadmin/maintenance/invoice-backfill', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    runs: (companyId?: number) =>
      request<BackfillRun[]>(`/api/superadmin/maintenance/invoice-backfill/runs${companyId ? `?companyId=${companyId}` : ''}`, {
        method: 'GET'
      }),
    rollback: (runId: number) =>
      request<BackfillRun>(`/api/superadmin/maintenance/invoice-backfill/runs/${runId}/rollback`, {
        method: 'POST'
      })
  },

  // Plan notifications wave F2 — platform settings and the 10 SMS templates. Flat `Response` envelope.
  planNotifications: {
    getSettings: () =>
      request<PlanNotificationSettings>('/api/superadmin/plan-notifications/settings', { method: 'GET' }),
    updateSettings: (body: Partial<PlanNotificationSettings>) =>
      request<PlanNotificationSettings>('/api/superadmin/plan-notifications/settings', { method: 'PUT', body: JSON.stringify(body) }),
    templates: () =>
      request<PlanNotificationTemplate[]>('/api/superadmin/plan-notifications/templates', { method: 'GET' }),
    updateTemplate: (stage: string, lang: string, body: string) =>
      request<PlanNotificationTemplate>(`/api/superadmin/plan-notifications/templates/${stage}/${lang}`, {
        method: 'PUT', body: JSON.stringify({ body }),
      }),
    resetTemplates: (stage?: string, language?: string) =>
      request<PlanNotificationTemplate[]>('/api/superadmin/plan-notifications/templates/reset', {
        method: 'POST', body: JSON.stringify({ stage, language }),
      }),
    preview: (body: { stage: string; language: string; body?: string; companyId?: number }) =>
      request<PlanNotificationPreview>('/api/superadmin/plan-notifications/preview', { method: 'POST', body: JSON.stringify(body) }),
    testSend: (body: { phone: string; stage: string; language: string }) =>
      request<PlanNotificationTestSendResult>('/api/superadmin/plan-notifications/test-send', { method: 'POST', body: JSON.stringify(body) }),
    upcoming: (days = 14) =>
      request<PlanUpcomingResult>(`/api/superadmin/plan-notifications/upcoming?days=${days}`, { method: 'GET' }),
    log: (f: PlanLogFilters) => {
      const q = new URLSearchParams();
      Object.entries(f).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q.set(k, String(v)); });
      return request<PagedResponse<PlanLogRow>>(`/api/superadmin/plan-notifications/log?${q.toString()}`, { method: 'GET' });
    },
    smsStats: (from: string, to: string) =>
      request<PlanSmsStats>(`/api/superadmin/plan-notifications/stats/sms?from=${from}&to=${to}`, { method: 'GET' }),
    expiryStats: (from: string, to: string) =>
      request<PlanExpiryStats>(`/api/superadmin/plan-notifications/stats/expiry?from=${from}&to=${to}`, { method: 'GET' }),
  },
  // Plan notifications wave F3 — one gym's plan-notification preferences. Flat `Response` envelope.
  notificationPrefs: {
    get: (companyId: number) =>
      request<NotificationPrefs>(`/api/superadmin/companies/${companyId}/notification-prefs`, { method: 'GET' }),
    update: (companyId: number, body: UpdateNotificationPrefsRequest) =>
      request<NotificationPrefs>(`/api/superadmin/companies/${companyId}/notification-prefs`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
  },
  // Plan notifications wave F1 — offline platform payments (run/CONTRACT.md). Flat `Response` envelope.
  platformPayments: {
    preview: (companyId: number, params: { planId?: string; period?: string; months?: number }) => {
      const q = new URLSearchParams();
      if (params.planId) q.set('planId', params.planId);
      if (params.period) q.set('period', params.period);
      if (params.months != null) q.set('months', String(params.months));
      return request<PlatformPaymentPreview>(`/api/superadmin/companies/${companyId}/payments/preview?${q.toString()}`, { method: 'GET' });
    },
    record: (companyId: number, body: RecordPlatformPaymentRequest) =>
      request<PlatformPaymentResult>(`/api/superadmin/companies/${companyId}/payments`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    voidInvoice: (invoiceId: string, reason: string) =>
      request<PlatformPaymentResult>(`/api/superadmin/billing/invoices/${invoiceId}/void`, {
        method: 'PATCH',
        body: JSON.stringify({ reason }),
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