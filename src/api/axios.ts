import axios, { InternalAxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import toast from 'react-hot-toast';

/**
 * Axios Instance
 * Hardcoded base URL for stability
 */

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'https://amlos-backend.onrender.com',
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000, // 15 second timeout (Render cold-starts can be slow)
});

// Helper to manually set/clear the token on the axios defaults
export const setAuthToken = (token: string | null): void => {
  if (token) {
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axiosInstance.defaults.headers.common['Authorization'];
  }
};

// Multi-tenant security: Clear all authentication data
export const clearAllAuthData = (): void => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('role');
  localStorage.removeItem('user');
  localStorage.removeItem('campus_id');
  localStorage.removeItem('campus_name');
  localStorage.removeItem('school_id');
  delete axiosInstance.defaults.headers.common['Authorization'];
};

// Request interceptor — attach Bearer token and tenant context
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Log request for debugging (only in development)
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }
    
    // Attach Bearer token
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    
    // Multi-tenant: Attach campus_id to header if available
    const campusId = localStorage.getItem('campus_id');
    if (campusId && campusId !== 'ALL' && config.headers) {
      config.headers.set('X-Campus-ID', campusId);
      config.headers.set('X-Tenant-ID', campusId);
    }
    
    // Attach school_id if available
    const schoolId = localStorage.getItem('school_id');
    if (schoolId && config.headers) {
      config.headers.set('X-School-ID', schoolId);
    }
    
    return config;
  },
  (error: AxiosError): Promise<AxiosError> => Promise.reject(error)
);

// Response interceptor — handle errors appropriately
axiosInstance.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  (error: AxiosError<Record<string, unknown>>): Promise<AxiosError> => {
    const status = error.response?.status;
    const data = error.response?.data;

    // Extract readable message from Django response
    let backendMsg = '';
    if (typeof data === 'string') { 
      backendMsg = data; 
    } else if (data && typeof data === 'object') {
      if (typeof data.detail === 'string') backendMsg = data.detail;
      else if (typeof data.message === 'string') backendMsg = data.message;
      else if (typeof data.error === 'string') backendMsg = data.error;
      else {
        const parts: string[] = [];
        for (const [key, val] of Object.entries(data)) {
          if (Array.isArray(val)) parts.push(`${key}: ${(val as string[]).join(', ')}`);
          else if (typeof val === 'string') parts.push(`${key}: ${val}`);
        }
        backendMsg = parts.join(' | ');
      }
    }

    // Handle specific status codes
    switch (status) {
      case 400:
        toast.error(backendMsg || 'Bad request. Please check your input.', {
          duration: 4000,
          id: 'api-400',
        });
        break;
        
      case 401:
        toast.error(backendMsg || 'Session expired. Please log in again.', {
          duration: 4000,
          id: 'api-401',
        });
        // Clear auth and redirect on 401
        setTimeout(() => {
          clearAllAuthData();
          window.location.href = '/login';
        }, 1500);
        break;
        
      case 403:
        console.error('[SECURITY] 403 Forbidden:', {
          url: error.config?.url,
          timestamp: new Date().toISOString(),
        });
        toast.error('Access Denied. You do not have permission.', {
          duration: 5000,
          id: 'api-403',
        });
        // Clear auth on 403 (security violation)
        clearAllAuthData();
        window.location.href = '/login?security=forbidden';
        break;
        
      case 404:
        // Don't show toast for 404 on login - let Login.tsx handle it
        if (!error.config?.url?.includes('login')) {
          toast.error('Resource not found.', { duration: 4000, id: 'api-404' });
        }
        break;
        
      case 500:
      case 502:
      case 503:
        toast.error('Server error. Please try again later.', {
          duration: 5000,
          id: 'api-500',
        });
        break;
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
