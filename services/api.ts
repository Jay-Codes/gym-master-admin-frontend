import {
  ApiResponse, SuperAdmin, User, Company,
  CreateSuperAdminRequest, CreateUserRequest, CreateCompanyRequest,
  PageableResponse, ActivationRequest, UpdateMessagingRequest,
  SmsBalanceData, UpdateSmsBalanceRequest
} from '../types';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const request = async <T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
    });

    // Parse JSON. If response is empty (e.g. 204), this might fail, 
    // but the docs suggest wrapped responses for most endpoints.
    // For DELETE, if it returns 200 OK with body, it works.
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error: any) {
    console.error(`API Error [${endpoint}]:`, error);
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
    validate: () =>
      request<{ role: string }>('/api/superadmin/auth/validate', { method: 'GET' })
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
      request<SuperAdmin>(`/api/superadmin/${id}/toggle-status`, { method: 'PATCH' })
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
    }
  }
};