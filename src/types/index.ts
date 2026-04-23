// --- Role ---
// These values are the exact strings returned by the backend in the `role` field.
export type Role = 'ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER';

/**
 * Maps each backend role to its post-login dashboard path.
 * Used by Login (redirect) and ProtectedRoute (role-mismatch fallback).
 */
export const ROLE_DASHBOARD_MAP: Record<Role, string> = {
  ADMIN: '/super-admin-dashboard',
  SCHOOL_ADMIN: '/school-dashboard',
  TEACHER: '/teacher-dashboard',
};

// --- User ---
export interface User {
  id: string | number;
  email: string;
  role: Role;
  school_id?: string;
}

// --- Domain Models ---
export interface School {
  id: string;
  school_name: string;
  registration_number: string;
  address: string;
  website?: string;
  established_year: number;
  created_at?: string;
  updated_at?: string;
}

export interface Student {
  id: string;
  school_id: string;
  name: string;
  class: string;
  parent_contact: string;
  created_at?: string;
  updated_at?: string;
}

// --- Auth ---
export interface AuthResponse {
  success?: boolean;
  message?: string;
  data?: {
    user?: User;
    tokens?: {
      refresh?: string;
      access?: string;
    };
  };
  // Fallbacks for older flat structures
  access_token?: string;
  access?: string;
  refresh_token?: string;
  refresh?: string;
  role?: string;
  user?: User;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}
