// --- Login Credentials ---
/**
 * Login request payload - matches Django backend expectations
 * Backend expects 'username' field (can be email or username)
 */
export interface LoginCredentials {
  username: string;  // Django backend field name
  password: string;
}

// --- Role ---
// Multi-tenant RBAC roles as returned by backend
export type Role = 'SUPER_ADMIN' | 'CAMPUS_ADMIN' | 'ADMIN' | 'SCHOOL_ADMIN' | 'SCHOOL' | 'TEACHER';

/**
 * Role hierarchy and access levels
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 100,    // Full system access, all campuses
  CAMPUS_ADMIN: 50,    // Single campus access only
  ADMIN: 50,           // Legacy - treated as campus level
  SCHOOL_ADMIN: 40,    // Legacy - school level
  SCHOOL: 35,          // School-level access (simplified role)
  TEACHER: 20,         // Class level
};

/**
 * Checks if role has cross-tenant access (Super Admin only)
 */
export const hasCrossTenantAccess = (role: Role): boolean => {
  return role === 'SUPER_ADMIN';
};

/**
 * Checks if role is tenant-isolated (Campus/School Admin)
 */
export const isTenantIsolated = (role: Role): boolean => {
  return role === 'CAMPUS_ADMIN' || role === 'SCHOOL_ADMIN';
};

/**
 * Maps roles to their default dashboard paths
 * CAMPUS_ADMIN will be dynamically redirected to /campus/:id/dashboard
 */
export const ROLE_DASHBOARD_MAP: Record<Role, string> = {
  SUPER_ADMIN: '/super-admin/dashboard',
  CAMPUS_ADMIN: '/campus/dashboard', // Will be replaced with actual campus ID
  SCHOOL_ADMIN: '/campus/dashboard', // Tenant-isolated, replaced with actual campus ID
  SCHOOL: '/school/dashboard', // School admin dashboard
  ADMIN: '/dashboard',
  TEACHER: '/teacher-dashboard',
};

// --- User ---
export interface User {
  id: string | number;
  email: string;
  username?: string;
  role: Role;
  school_id?: string;
  campus_id?: string;      // Multi-tenant: current campus tenant
  campus_name?: string;    // Display name for UI
  active_tenant_id?: string; // Alias for campus_id
  access_level?: 'SUPER' | 'ADMIN' | 'USER'; // Access level for role granularity
  profile?: {
    access_level?: 'SUPER' | 'ADMIN' | 'USER';
    [key: string]: unknown;
  };
}

// --- Domain Models ---
/**
 * School — backend GET /api/auth/schools response.
 * Declared with every known Django-serializer field as optional
 * plus an index signature so the frontend never breaks when the
 * backend adds, removes, or renames keys.
 */
export interface School {
  // Core identity (always present in GET list)
  id: string | number;
  school_name: string;
  address: string;

  // Optional / may vary by backend serializer version
  registration_number?: string;
  website?: string;
  established_year?: number;
  status?: 'active' | 'inactive' | 'pending';

  // Principal / admin — mapped by normalizeSchool()
  principal_name?: string;
  admin_name?: string;
  username?: string;
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  contact_name?: string;

  // Email — mapped by normalizeSchool()
  email?: string;
  admin_email?: string;
  school_email?: string;
  contact_email?: string;

  // User/admin nested objects (some serializers return these)
  user?: {
    username?: string;
    email?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
  };
  admin?: {
    username?: string;
    email?: string;
    name?: string;
  };
  contact?: {
    email?: string;
    name?: string;
  };
  principal?: {
    email?: string;
    name?: string;
  };
  profile?: {
    name?: string;
    email?: string;
  };

  // Counts & metadata
  students_count?: number;
  teachers_count?: number;
  students?: number;
  teachers?: number;
  created_at?: string;
  updated_at?: string;
  phone?: string;
  phone_number?: string;
  city?: string;
  state?: string;
  zip_code?: number | string;

  // Catch-all so TypeScript never complains about unknown keys
  [key: string]: any;
}

/**
 * ISchoolData — canonical front-end form model.
 * STRICT: administrator field is `principalName` (NOT adminName).
 * Exported for reuse across AddSchool, EditSchool, SchoolDetail, etc.
 */
export interface ISchoolData {
  schoolName: string;
  principalName: string;   // Maps to backend `username` — DO NOT rename
  email: string;
  password: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  registrationNumber: string;
  establishedYear: string;
}

/** Payload for POST /api/auth/school/create — built from ISchoolData */
export interface CreateSchoolPayload {
  username: string;            // principalName
  principal_name: string;      // explicitly sent for backends that prefer this key
  password: string;
  email: string;
  school_name: string;
  registration_number: string;
  address: string;
  website: string;
  established_year: number;
  phone?: string;
  phone_number?: string;
  city?: string;
  state?: string;
  zip_code?: number;
}

/**
 * Student — backend GET /api/auth/schools/{schoolId}/students response.
 * Declared with every known field as optional plus an index signature
 * so the frontend never breaks when the backend changes keys.
 */
export interface Student {
  id: string | number;
  full_name?: string;
  name?: string;
  email?: string;
  dob?: string;
  enrollment_date?: string;
  class_grade?: string;
  grade?: string;
  class?: string;
  section?: string;
  guardian_name?: string;
  guardian_contact?: string;
  guardian_relation?: string;
  parent_name?: string;
  parent_contact?: string;
  parent_relation?: string;
  username?: string;
  student_id?: string;
  roll_number?: string;
  password?: string;
  school_id?: string;
  gpa?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

/**
 * IStudentData — canonical front-end form model for the 4-step Add Student form.
 */
export interface IStudentData {
  fullName: string;
  email: string;
  dob: string;
  classGrade: string;
  section: string;
  guardianName: string;
  guardianContact: string;
  guardianRelation: string;
  username: string;
  password: string;
  studentId: string;
}

/** Payload for POST /api/auth/schools/{schoolId}/students — built from IStudentData */
export interface CreateStudentPayload {
  full_name: string;
  email: string;
  dob: string;
  class_grade: string;
  section: string;
  guardian_name: string;
  guardian_contact: string;
  guardian_relation: string;
  username: string;
  password: string;
  student_id: string;
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
  planner_name?: string;
  exam_type?: string;
  duration?: string;
  duration_weeks?: number;
  start_date: string;
  end_date: string;
  daily_limit_minutes?: number;
  description?: string;
  subjects?: number[] | string[];
  chapters?: number[];
  subject_ids?: number[];
  status?: string;
  created_at?: string;
  school_id?: string | number;
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
    // Multi-tenant fields
    campus_id?: string;
    school_id?: string;
    tenant_id?: string;    // Alternative field name
    // Access control
    access_level?: 'SUPER' | 'ADMIN' | 'USER';
  };
  // Fallbacks for older flat structures
  access_token?: string;
  access?: string;
  refresh_token?: string;
  refresh?: string;
  role?: string;
  user?: User;
  campus_id?: string;
  school_id?: string;
  access_level?: 'SUPER' | 'ADMIN' | 'USER';
}

// --- Multi-Tenant Context ---
export interface TenantContext {
  campus_id: string | null;
  campus_name: string | null;
  isSuperAdmin: boolean;
  canAccessTenant: (tenantId: string) => boolean;
}

// Security violation types
export type SecurityViolation = 'TENANT_MISMATCH' | 'TOKEN_EXPIRED' | 'INSUFFICIENT_PRIVILEGES';

export interface SecurityEvent {
  type: SecurityViolation;
  timestamp: number;
  userId?: string;
  attemptedTenant?: string;
  actualTenant?: string;
  ip?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}
