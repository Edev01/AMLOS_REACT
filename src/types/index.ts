// --- Role ---
// These values are the exact strings returned by the backend in the `role` field.
export type Role = 'ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER';

/**
 * Maps each backend role to its post-login dashboard path.
 * Used by Login (redirect) and ProtectedRoute (role-mismatch fallback).
 */
export const ROLE_DASHBOARD_MAP: Record<Role, string> = {
  ADMIN: '/dashboard',
  SCHOOL_ADMIN: '/school-dashboard',
  TEACHER: '/teacher-dashboard',
};

// --- User ---
export interface User {
  id: string | number;
  email: string;
  username?: string;
  role: Role;
  school_id?: string;
}

// --- Domain Models ---
export interface School {
  id: string | number;
  school_name: string;
  registration_number: string;
  address: string;
  website?: string;
  established_year: number;
  admin_name?: string;
  admin_email?: string;
  students_count?: number;
  teachers_count?: number;
  status?: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

/** Payload for POST /api/auth/school/create — CRITICAL OVERRIDE */
export interface CreateSchoolPayload {
  username: string;
  password: string;
  email: string;
  school_name: string;
  registration_number: string;
  address: string;
  website: string;
  established_year: number;
}

export interface Student {
  id: string | number;
  username?: string;
  email?: string;
  roll_number?: string;
  grade?: string;
  gpa?: number;
  school_id?: string;
  name?: string;
  class?: string;
  parent_contact?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Teacher {
  id: string | number;
  username: string;
  school_id?: string;
  created_at?: string;
}

// --- Curriculum ---
export interface Subject {
  id: number;
  name: string;
  description?: string;
  grade?: string;
}

export interface Chapter {
  id: number;
  subject: number;
  name: string;
  chapter_number: number;
  description?: string;
}

export interface SLO {
  id: number;
  chapter: number;
  slo_text: string;
  priority?: string;
  suggested_time_minutes?: number;
}

// --- Study Plans ---
export interface StudyPlan {
  id: number;
  plan_name: string;
  start_date: string;
  end_date: string;
  daily_limit_minutes?: number;
  subject_ids?: number[];
  status?: string;
  created_at?: string;
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
