import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthResponse, Role, ROLE_DASHBOARD_MAP, hasCrossTenantAccess } from '../types';
import { setAuthToken, markLoginTimestamp } from '../api/axios';

interface TenantContext {
  campusId: string | null;
  campusName: string | null;
  schoolId: string | null;
}

interface AuthContextType {
  user: User | null;
  tenant: TenantContext;
  login: (data: AuthResponse, loggedInUsername?: string) => void;
  mockLogin: () => void;
  logout: () => void;
  getDashboardPath: () => string;
  getTenantDashboardPath: () => string | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  canAccessTenant: (tenantId: string) => boolean;
  triggerSecurityBreach: (reason: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys for multi-tenant security
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  ROLE: 'role',
  CAMPUS_ID: 'campus_id',
  CAMPUS_NAME: 'campus_name',
  SCHOOL_ID: 'school_id',
} as const;

/**
 * Recursively scan an object for any key that looks like a school identifier.
 * Returns the first non-empty string value found under a key containing 'school'.
 */
const findSchoolIdDeep = (obj: unknown): string | undefined => {
  if (!obj || typeof obj !== 'object') return undefined;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findSchoolIdDeep(item);
      if (found) return found;
    }
    return undefined;
  }
  for (const [key, val] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (
      (lowerKey.includes('school') || lowerKey === 'id') &&
      typeof val === 'string' &&
      val.length > 0
    ) {
      return val;
    }
    if (typeof val === 'object' && val !== null) {
      const nested = findSchoolIdDeep(val);
      if (nested) return nested;
    }
  }
  return undefined;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<TenantContext>({
    campusId: null,
    campusName: null,
    schoolId: null,
  });
  // isLoading starts TRUE — prevents ProtectedRoute from redirecting
  // until we've finished checking localStorage for an existing session.
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate auth state from localStorage on mount.
  // All operations here are synchronous — React 18 batches the state
  // updates so the very first committed render will have user+tenant+isLoading=false.
  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
    const storedCampusId = localStorage.getItem(STORAGE_KEYS.CAMPUS_ID);
    const storedCampusName = localStorage.getItem(STORAGE_KEYS.CAMPUS_NAME);
    const storedSchoolId = localStorage.getItem(STORAGE_KEYS.SCHOOL_ID);

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Hydrate axios with the stored token immediately
        setAuthToken(storedToken);
        setUser(parsedUser);
        setTenant({
          campusId: storedCampusId || parsedUser.campus_id || null,
          campusName: storedCampusName || parsedUser.campus_name || null,
          schoolId: storedSchoolId || parsedUser.school_id || null,
        });
      } catch {
        // Invalid stored data - clear everything
        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
        setAuthToken(null);
      }
    }

    // Token check is complete — allow routing to proceed.
    // No setTimeout: React 18 batches all the setUser/setTenant/setIsLoading
    // updates into a single render, so ProtectedRoute will see the user
    // and isLoading=false atomically.
    setIsLoading(false);
  }, []);

  const clearAllAuthData = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    setAuthToken(null);
    setUser(null);
    setTenant({ campusId: null, campusName: null, schoolId: null });
  }, []);

  /**
   * Security Breach Protocol
   * Called when tenant mismatch or unauthorized access is detected
   */
  const triggerSecurityBreach = useCallback((reason: string) => {
    console.error(`[SECURITY BREACH] ${reason}`);
    
    // Clear all authentication data
    clearAllAuthData();
    
    // Dispatch security event for monitoring
    window.dispatchEvent(new CustomEvent('security-breach', {
      detail: { reason, timestamp: Date.now() }
    }));
    
    // Redirect to login
    window.location.href = '/login?security=breach';
  }, [clearAllAuthData]);

  /**
   * Multi-tenant login with campus/school isolation.
   *
   * CRITICAL SEQUENCE:
   *   1. Write token + user to localStorage (synchronous)
   *   2. Set token on axios instance (synchronous)
   *   3. Update React state (batched)
   *
   * After this function returns, localStorage and axios are guaranteed
   * to have the token. The caller (Login.tsx) can safely navigate.
   */
  const login = useCallback((data: AuthResponse, loggedInUsername?: string) => {
    // Mark login timestamp so axios interceptor won't redirect during grace window
    markLoginTimestamp();

    // Extract tokens
    const accessToken = data.data?.tokens?.access || data.access_token || data.access || '';
    const refreshToken = data.data?.tokens?.refresh || data.refresh_token || data.refresh || '';
    
    // Extract role
    const role = (data.data?.user?.role || data.role) as Role;
    if (!role) throw new Error('Login response did not include a role.');

    // Extract multi-tenant identifiers (defensive multi-path extraction)
    const campusId = data.data?.campus_id || data.data?.tenant_id || data.campus_id || '';
    const schoolId =
      data.data?.school_id ||
      (data.data?.user as any)?.school_id ||
      data.school_id ||
      findSchoolIdDeep(data) ||
      '';
    const campusName = data.data?.user?.campus_name || '';
    
    // Extract access level from various possible response structures
    const accessLevel = (data.data?.user?.access_level || 
                        data.data?.user?.profile?.access_level ||
                        data.data?.access_level ||
                        (role === 'SUPER_ADMIN' ? 'SUPER' : undefined));

    // Defensive: Handle case where backend returns user as just an ID (number) instead of full object
    const rawUser = data.data?.user || data.user;
    const isUserObject = rawUser && typeof rawUser === 'object' && !Array.isArray(rawUser);
    const rawUserAny = isUserObject ? (rawUser as unknown as Record<string, unknown>) : null;
    const userId = isUserObject ? ((rawUserAny?.id || rawUserAny?.user_id || '1') as string | number) : (typeof rawUser === 'number' || typeof rawUser === 'string' ? rawUser : '1');
    const userEmail = isUserObject ? ((rawUserAny?.email || loggedInUsername || 'admin@eduadmin.com') as string) : (loggedInUsername || 'admin@eduadmin.com');
    const userUsername = isUserObject ? ((rawUserAny?.username || rawUserAny?.name || `Admin ID: ${userId}`) as string) : `Admin ID: ${userId}`;

    // Build user object with tenant context
    const loggedInUser: User = {
      id: userId,
      email: userEmail,
      username: userUsername,
      role,
      campus_id: campusId,
      school_id: schoolId,
      campus_name: campusName,
      active_tenant_id: campusId, // Alias for consistency
      access_level: accessLevel as 'SUPER' | 'ADMIN' | 'USER' | undefined,
      // Preserve any additional properties if user was a full object
      ...(isUserObject ? rawUser : {}),
    };

    // ─── STEP 1: Persist to localStorage SYNCHRONOUSLY ───
    if (accessToken) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    if (refreshToken) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    localStorage.setItem(STORAGE_KEYS.ROLE, role);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(loggedInUser));
    if (campusId) localStorage.setItem(STORAGE_KEYS.CAMPUS_ID, campusId);
    if (campusName) localStorage.setItem(STORAGE_KEYS.CAMPUS_NAME, campusName);
    localStorage.setItem(STORAGE_KEYS.SCHOOL_ID, schoolId);

    // ─── STEP 2: Set token on axios instance SYNCHRONOUSLY ───
    if (accessToken) setAuthToken(accessToken);

    if (import.meta.env.DEV) {
      console.log('[AuthContext] login persisted:', { campusId, schoolId, campusName, role });
    }

    // ─── STEP 3: Update React state (batched by React 18) ───
    setUser(loggedInUser);
    setTenant({
      campusId: campusId || null,
      campusName: campusName || null,
      schoolId: schoolId || null,
    });
    // Do NOT touch isLoading here — it's already false after hydration.
    // Toggling it would cause ProtectedRoute to flash "Loading…" during navigation.
  }, []);

  /** UI-First mode: create a fake SUPER_ADMIN session for development */
  const mockLogin = useCallback(() => {
    const fakeUser: User = { 
      id: '1', 
      email: 'superadmin@eduadmin.com', 
      username: 'SuperAdmin', 
      role: 'SUPER_ADMIN',
      campus_id: 'ALL',
      campus_name: 'System Wide',
    };
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'mock-token-superadmin');
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'mock-refresh');
    localStorage.setItem(STORAGE_KEYS.ROLE, 'SUPER_ADMIN');
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(fakeUser));
    localStorage.setItem(STORAGE_KEYS.CAMPUS_ID, 'ALL');
    localStorage.setItem(STORAGE_KEYS.CAMPUS_NAME, 'System Wide');
    setUser(fakeUser);
    setTenant({ campusId: 'ALL', campusName: 'System Wide', schoolId: null });
  }, []);

  const logout = useCallback(() => {
    clearAllAuthData();
    window.location.href = '/login';
  }, [clearAllAuthData]);

  /**
   * Get base dashboard path based on role
   */
  const getDashboardPath = useCallback((): string => {
    if (!user?.role) return '/login';
    return ROLE_DASHBOARD_MAP[user.role] || '/login';
  }, [user]);

  /**
   * Get tenant-specific dashboard path
   * Returns null if user doesn't have campus access
   */
  const getTenantDashboardPath = useCallback((): string | null => {
    if (!user?.role) return null;
    
    // Super admins AND plain ADMIN go to central dashboard
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      return '/admin/dashboard';
    }
    
    // Tenant-isolated roles (CAMPUS_ADMIN, SCHOOL_ADMIN)
    const isTenantRole = user.role === 'CAMPUS_ADMIN' || 
                         user.role === 'SCHOOL_ADMIN';
    
    if (isTenantRole && tenant.campusId) {
      return `/campus/${tenant.campusId}/dashboard`;
    }
    
    // Fallback for legacy roles
    return ROLE_DASHBOARD_MAP[user.role] || null;
  }, [user, tenant.campusId]);

  /**
   * Check if user can access a specific tenant
   */
  const canAccessTenant = useCallback((tenantId: string): boolean => {
    if (!user?.role) return false;
    
    // Super admin can access any tenant
    if (hasCrossTenantAccess(user.role)) return true;
    
    // Tenant-isolated roles can only access their assigned campus
    return tenant.campusId === tenantId;
  }, [user, tenant.campusId]);

  // Derived state - check both role and access_level for Super Admin
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || 
                       user?.access_level === 'SUPER' ||
                       user?.profile?.access_level === 'SUPER';

  return (
    <AuthContext.Provider value={{ 
      user, 
      tenant,
      login, 
      mockLogin, 
      logout, 
      getDashboardPath, 
      getTenantDashboardPath,
      isLoading,
      isSuperAdmin,
      canAccessTenant,
      triggerSecurityBreach,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};