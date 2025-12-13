import axios from 'axios';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import type { 
  Batch, 
  Inspection, 
  Certificate, 
  Notification, 
  BatchDraft,
  VerificationResult,
  ApiResponse,
  PaginatedResponse,
  User,
  CreateBatchPayload,
  UpdateBatchPayload,
  CreateInspectionPayload
} from '@/types';
import { 
  mockBatches, 
  mockInspections, 
  mockCertificates, 
  mockNotifications 
} from './mockData';

// Create axios instance with real backend URL
export const apiClient = axios.create({
  baseURL: (import.meta as any)?.env?.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('agriqcert_access_token');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
let isRefreshing = false;
type QueueItem = { resolve: (value?: string | null) => void; reject: (reason?: unknown) => void };
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (err: unknown) => {
    const error = err as AxiosError;
    const originalRequest = (error.config || {}) as AxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and we haven't tried to refresh yet
    if (error?.response?.status === 401 && !originalRequest?._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise<string | null>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (token) {
            originalRequest.headers = originalRequest.headers || {};
            (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${token}`;
            return apiClient(originalRequest as AxiosRequestConfig);
          }
          return Promise.reject(error);
        }).catch((err2) => {
          return Promise.reject(err2);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('agriqcert_refresh_token');

      if (!refreshToken) {
        processQueue(error, null);
        isRefreshing = false;
        // No refresh token, redirect to login
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post('http://localhost:5001/api/auth/refresh', {
          refreshToken,
        });

        const { tokens } = response.data.data;
        if (!tokens || !tokens.accessToken) {
          throw new Error('Invalid refresh response');
        }

        localStorage.setItem('agriqcert_access_token', tokens.accessToken);
        localStorage.setItem('agriqcert_refresh_token', tokens.refreshToken);

        // Process queued requests
        processQueue(null, tokens.accessToken);
        isRefreshing = false;

        // Retry the original request with new token
        originalRequest.headers = originalRequest.headers || {};
        (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${tokens.accessToken}`;
        return apiClient(originalRequest as AxiosRequestConfig);

      } catch (refreshError) {
        // Refresh failed, clear queue and redirect to login
        processQueue(refreshError, null);
        isRefreshing = false;

        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Simulated network delay (for mock APIs that haven't been migrated yet)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// API implementations
export const api = {
  // Auth - Note: AuthContext handles auth directly, but these are available if needed
  auth: {
    login: async (email: string, password: string) => {
      const response = await apiClient.post('/auth/login', { email, password });
      return response.data;
    },
    
    register: async (email: string, password: string, name: string, role: string) => {
      const response = await apiClient.post('/auth/register', { email, password, name, role });
      return response.data;
    },
    
    logout: async (refreshToken: string) => {
      const response = await apiClient.post('/auth/logout', { refreshToken });
      return response.data;
    },
    
    profile: async () => {
      const response = await apiClient.get('/auth/profile');
      return response.data;
    },

    updateProfile: async (profileData: Record<string, unknown>) => {
      const response = await apiClient.put('/auth/profile', profileData);
      return response.data;
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
      const response = await apiClient.put('/auth/change-password', { 
        currentPassword, 
        newPassword 
      });
      return response.data;
    },
  },

  // Batches
  batches: {
    list: async (filters?: { status?: string; farmerId?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Batch>> => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.farmerId) params.append('farmerId', filters.farmerId);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      
      const response = await apiClient.get(`/batches?${params.toString()}`);
      return response.data.data;
    },

    get: async (id: string): Promise<ApiResponse<Batch>> => {
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error('Invalid batch ID provided');
      }
      const response = await apiClient.get(`/batches/${id}`);
      // Backend returns {success: true, data: {batch}}, extract batch and restructure
      if (!response.data?.data?.batch) {
        throw new Error('Invalid response structure: batch not found in response');
      }
      return {
        success: response.data.success,
        data: response.data.data.batch,
        message: response.data.message
      };
    },

    create: async (data: CreateBatchPayload): Promise<ApiResponse<Batch>> => {
      const response = await apiClient.post('/batches', data);
      // Backend returns {success: true, data: {batch}}, extract batch and restructure
      return {
        success: response.data.success,
        data: response.data.data.batch,
        message: response.data.message
      };
    },

    update: async (id: string, data: UpdateBatchPayload): Promise<ApiResponse<Batch>> => {
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error('Invalid batch ID provided');
      }
      const response = await apiClient.put(`/batches/${id}`, data);
      // Backend returns {success: true, data: {batch}}, extract batch and restructure
      return {
        success: response.data.success,
        data: response.data.data.batch,
        message: response.data.message
      };
    },

    submit: async (id: string): Promise<ApiResponse<Batch>> => {
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error('Invalid batch ID provided');
      }
      const response = await apiClient.post(`/batches/${id}/submit`);
      // Backend returns {success: true, data: {batch}}, extract batch and restructure
      return {
        success: response.data.success,
        data: response.data.data.batch,
        message: response.data.message
      };
    },

    delete: async (id: string): Promise<void> => {
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error('Invalid batch ID provided');
      }
      await apiClient.delete(`/batches/${id}`);
    },

    stats: async (): Promise<ApiResponse<Record<string, unknown>>> => {
      const response = await apiClient.get('/batches/stats');
      return response.data;
    },
  },

  // Drafts
  drafts: {
    save: async (draft: BatchDraft): Promise<ApiResponse<BatchDraft>> => {
      await delay(300);
      localStorage.setItem(`draft_${draft.id}`, JSON.stringify(draft));
      return { success: true, data: draft };
    },

    get: async (id: string): Promise<ApiResponse<BatchDraft | null>> => {
      await delay(200);
      const stored = localStorage.getItem(`draft_${id}`);
      return { 
        success: true, 
        data: stored ? JSON.parse(stored) : null 
      };
    },

    delete: async (id: string): Promise<void> => {
      await delay(200);
      localStorage.removeItem(`draft_${id}`);
    },

    list: async (): Promise<BatchDraft[]> => {
      await delay(300);
      const drafts: BatchDraft[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('draft_')) {
          const draft = localStorage.getItem(key);
          if (draft) {
            drafts.push(JSON.parse(draft));
          }
        }
      }
      return drafts;
    },
  },

  // Inspections
  inspections: {
    list: async (filters?: { batchId?: string; status?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Inspection>> => {
      const params = new URLSearchParams();
      if (filters?.batchId && filters.batchId !== 'undefined') params.append('batchId', filters.batchId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      
      const response = await apiClient.get(`/inspections?${params.toString()}`);
      return response.data.data;
    },

    get: async (id: string): Promise<ApiResponse<Inspection>> => {
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error('Invalid inspection ID provided');
      }
      const response = await apiClient.get(`/inspections/${id}`);
      // Backend returns {success: true, data: {inspection}}, extract inspection and restructure
      return {
        success: response.data.success,
        data: response.data.data.inspection,
        message: response.data.message
      };
    },

    create: async (batchId: string, data: CreateInspectionPayload): Promise<ApiResponse<Inspection>> => {
      if (!batchId || batchId === 'undefined' || batchId === 'null') {
        throw new Error('Invalid batch ID provided');
      }
      const response = await apiClient.post(`/inspections/batch/${batchId}`, data);
      // Backend returns {success: true, data: {inspection}}, extract inspection and restructure
      return {
        success: response.data.success,
        data: response.data.data.inspection,
        message: response.data.message
      };
    },

    update: async (id: string, data: Partial<Inspection>): Promise<ApiResponse<Inspection>> => {
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error('Invalid inspection ID provided');
      }
      const response = await apiClient.put(`/inspections/${id}`, data);
      // Backend returns {success: true, data: {inspection}}, extract inspection and restructure
      return {
        success: response.data.success,
        data: response.data.data.inspection,
        message: response.data.message
      };
    },

    complete: async (id: string, data: { passed: boolean; comments?: string; readings?: unknown[] }): Promise<ApiResponse<Inspection>> => {
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error('Invalid inspection ID provided');
      }
      const response = await apiClient.post(`/inspections/${id}/complete`, data);
      // Backend returns {success: true, data: {inspection}}, extract inspection and restructure
      return {
        success: response.data.success,
        data: response.data.data.inspection,
        message: response.data.message
      };
    },

    getByBatch: async (batchId: string): Promise<ApiResponse<{ inspections: Inspection[] }>> => {
      if (!batchId || batchId === 'undefined' || batchId === 'null') {
        throw new Error('Invalid batch ID provided');
      }
      const response = await apiClient.get(`/inspections/batch/${batchId}`);
      // Backend returns {success: true, data: {inspections}}, return as-is since it matches the expected structure
      return response.data;
    },
  },

  // Certificates
  certificates: {
    list: async (): Promise<PaginatedResponse<Certificate>> => {
      await delay(500);
      return {
        data: mockCertificates,
        total: mockCertificates.length,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };
    },

    get: async (id: string): Promise<ApiResponse<Certificate>> => {
      await delay(400);
      const cert = mockCertificates.find(c => c.id === id);
      if (!cert) {
        throw new Error('Certificate not found');
      }
      return { success: true, data: cert };
    },

    issue: async (batchId: string): Promise<ApiResponse<Certificate>> => {
      await delay(1500);
      // This would normally be a complex VC issuance process
      const cert = mockCertificates[0]; // Return existing mock for demo
      return { success: true, data: cert };
    },

    revoke: async (id: string, reason: string): Promise<ApiResponse<Certificate>> => {
      await delay(800);
      const cert = mockCertificates.find(c => c.id === id);
      if (!cert) {
        throw new Error('Certificate not found');
      }
      cert.status = 'revoked';
      cert.revokedAt = new Date().toISOString();
      cert.revocationReason = reason;
      return { success: true, data: cert };
    },
  },

  // Verification
  verify: {
    byId: async (certId: string): Promise<ApiResponse<VerificationResult>> => {
      await delay(1000);
      const cert = mockCertificates.find(c => c.id === certId);
      const batch = mockBatches.find(b => b.id === cert?.batchId);
      const inspection = mockInspections.find(i => i.batchId === cert?.batchId);
      
      if (!cert) {
        return {
          success: true,
          data: {
            isValid: false,
            errors: ['Certificate not found'],
            verifiedAt: new Date().toISOString(),
            timeline: [],
          },
        };
      }

      return {
        success: true,
        data: {
          isValid: cert.status === 'active',
          certificate: cert,
          batch,
          inspection,
          verifiedAt: new Date().toISOString(),
          timeline: [
            { event: 'Batch Created', date: batch?.createdAt || '', actor: batch?.farmerName || '', status: 'completed' },
            { event: 'Batch Submitted', date: batch?.submittedAt || '', actor: batch?.farmerName || '', status: 'completed' },
            { event: 'Inspection Completed', date: inspection?.completedAt || '', actor: inspection?.inspectorName || '', status: 'completed' },
            { event: 'Certificate Issued', date: cert.issuedAt, actor: 'AgriQCert Authority', status: 'completed' },
            { event: 'Certificate Valid Until', date: cert.expiresAt || '', actor: '', status: 'pending' },
          ],
        },
      };
    },

    byQR: async (qrData: string): Promise<ApiResponse<VerificationResult>> => {
      await delay(800);
      try {
        const parsed = JSON.parse(qrData);
        return api.verify.byId(parsed.certId);
      } catch {
        return {
          success: true,
          data: {
            isValid: false,
            errors: ['Invalid QR code data'],
            verifiedAt: new Date().toISOString(),
            timeline: [],
          },
        };
      }
    },
  },

  // Notifications
  notifications: {
    list: async (userId: string): Promise<PaginatedResponse<Notification>> => {
      await delay(400);
      const filtered = mockNotifications.filter(n => n.userId === userId);
      return {
        data: filtered,
        total: filtered.length,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };
    },

    markRead: async (id: string): Promise<void> => {
      await delay(200);
      const notif = mockNotifications.find(n => n.id === id);
      if (notif) {
        notif.read = true;
      }
    },
  },

  // File uploads
  uploads: {
    getPresignedUrl: async (filename: string, contentType: string): Promise<{ uploadUrl: string; publicUrl: string }> => {
      await delay(300);
      // In production, this would return actual presigned URLs
      return {
        uploadUrl: `/api/upload/${filename}`,
        publicUrl: `https://storage.agriqcert.com/${filename}`,
      };
    },

    upload: async (file: File, onProgress?: (progress: number) => void): Promise<string> => {
      // Simulate upload with progress
      for (let i = 0; i <= 100; i += 10) {
        await delay(100);
        onProgress?.(i);
      }
      return `https://storage.agriqcert.com/${file.name}`;
    },
  },
};
