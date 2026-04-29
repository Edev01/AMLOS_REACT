import axios, { InternalAxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import toast from 'react-hot-toast';

// Base URL — NO trailing slash, NO /api suffix here.
// All endpoint paths must begin with /api/...
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://amlos-backend.onrender.com',
  headers: { 'Content-Type': 'application/json' },
});

// Helper to manually set/clear the token on the axios defaults
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Request interceptor — attach Bearer token from localStorage to every request
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  },
  (error: AxiosError): Promise<AxiosError> => Promise.reject(error)
);

// Response interceptor — global toast on 400/401, auto-logout on 401
api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  (error: AxiosError<Record<string, unknown>>): Promise<AxiosError> => {
    const status = error.response?.status;
    const d = error.response?.data;

    // Extract a readable message from various Django response shapes
    let backendMsg = '';
    if (typeof d === 'string') { backendMsg = d; }
    else if (d && typeof d === 'object') {
      if (typeof d.detail === 'string') backendMsg = d.detail;
      else if (typeof d.message === 'string') backendMsg = d.message;
      else {
        const parts: string[] = [];
        for (const [key, val] of Object.entries(d)) {
          if (Array.isArray(val)) parts.push(`${key}: ${(val as string[]).join(', ')}`);
          else if (typeof val === 'string') parts.push(`${key}: ${val}`);
        }
        backendMsg = parts.join(' | ');
      }
    }

    if (status === 400) {
      toast.error(backendMsg || 'Bad request. Please check your input.', {
        duration: 4000,
        id: 'api-400',
      });
    }

    if (status === 401) {
      toast.error(backendMsg || 'Session expired. Please log in again.', {
        duration: 4000,
        id: 'api-401',
      });
      // Clear stored auth and redirect after a short delay so the toast is visible
      setTimeout(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('role');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }, 1500);
    }

    return Promise.reject(error);
  }
);

export default api;