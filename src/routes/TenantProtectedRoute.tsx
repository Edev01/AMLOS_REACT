import React from 'react';
import { Navigate, Outlet, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role, User, hasCrossTenantAccess } from '../types';
import toast from 'react-hot-toast';

interface TenantProtectedRouteProps {
  allowedRoles?: Role[];
  children?: React.ReactNode;
  requireTenantMatch?: boolean; // If true, enforces tenant URL matching
}

/**
 * Iron-Clad Tenant Protected Route
 * 
 * Security Protocol:
 * 1. Validates authentication token exists
 * 2. Validates user role is authorized
 * 3. For /campus/:tenantId/* routes: Validates URL tenant matches user's assigned tenant
 * 4. On tenant mismatch: Triggers Security Breach Protocol (logout + redirect)
 */
const TenantProtectedRoute: React.FC<TenantProtectedRouteProps> = ({ 
  allowedRoles, 
  children,
  requireTenantMatch = true 
}) => {
  const { user, tenant, isLoading, isSuperAdmin, canAccessTenant, triggerSecurityBreach } = useAuth();
  const params = useParams();
  const location = useLocation();

  // Show loading spinner while auth state is being hydrated
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="text-sm text-slate-500">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Step A: Check if authenticated
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Step B: Check role authorization
  // SUPER ADMIN BYPASS: Skip role restriction for Super Admins
  const userAccessLevel = user.access_level || user.profile?.access_level;
  const isSuperAdminUser = isSuperAdmin || user.role === 'SUPER_ADMIN' || userAccessLevel === 'SUPER';
  
  // Check if user is effectively a School Admin (ADMIN role + has campus_id)
  const isSchoolAdminUser = (user.role === 'SCHOOL_ADMIN' || user.role === 'CAMPUS_ADMIN' || 
                             (user.role === 'ADMIN' && tenant.campusId));
  
  // Check if role is allowed - include ADMIN if they have campus context
  const effectiveRole = user.role;
  const roleAllowed = !allowedRoles || 
                      allowedRoles.includes(effectiveRole) || 
                      (user.role === 'ADMIN' && isSchoolAdminUser && allowedRoles?.includes('SCHOOL_ADMIN'));
  
  if (!roleAllowed && !isSuperAdminUser) {
    // Role mismatch - redirect to their appropriate dashboard
    if (user.role === 'SUPER_ADMIN') {
      return <Navigate to="/super-admin/dashboard" replace />;
    }
    if (isSchoolAdminUser && tenant.campusId) {
      return <Navigate to={`/campus/${tenant.campusId}/dashboard`} replace />;
    }
    // Fallback for legacy roles
    const roleMap: Record<string, string> = {
      'ADMIN': '/admin/dashboard',
      'TEACHER': '/teacher-dashboard',
    };
    return <Navigate to={roleMap[user.role] || '/login'} replace />;
  }

  // Step C: Tenant Validation (The Shield)
  // Extract tenant ID from URL if present (/campus/:tenantId/*)
  const urlTenantId = params.tenantId || params.campusId;
  
  // Use isSuperAdminUser from Step B - Skip tenant validation for Super Admins
  if (urlTenantId && requireTenantMatch && !isSuperAdminUser) {
    // Only non-super-admins need tenant validation
    const hasAccess = canAccessTenant(urlTenantId);
    
    if (!hasAccess) {
      // SECURITY BREACH DETECTED
      // User is trying to access a tenant they don't belong to
      console.error(`[SECURITY ALERT] Tenant access violation:`, {
        userId: user.id,
        userRole: user.role,
        assignedTenant: tenant.campusId,
        attemptedTenant: urlTenantId,
        timestamp: new Date().toISOString(),
        path: location.pathname,
      });

      // Show critical security toast
      toast.error('Critical Access Violation: Unauthorized tenant access detected. Session terminated.', {
        duration: 5000,
        icon: '🔒',
        style: {
          background: '#DC2626',
          color: '#fff',
          fontWeight: 'bold',
        },
      });

      // Trigger security breach protocol
      triggerSecurityBreach(
        `Tenant mismatch: User ${user.id} attempted to access tenant ${urlTenantId} but belongs to ${tenant.campusId}`
      );

      // Return null while redirect happens
      return null;
    }
  }

  // All security checks passed - render the protected content
  return children ? <>{children}</> : <Outlet />;
};

export default TenantProtectedRoute;

/**
 * Helper hook for tenant-aware components
 */
export const useTenantContext = () => {
  const { tenant, user, isSuperAdmin } = useAuth();
  const params = useParams();
  const urlTenantId = params.tenantId || params.campusId;

  return {
    // Current tenant from URL or user's assigned tenant
    currentTenantId: urlTenantId || tenant.campusId,
    currentTenantName: tenant.campusName,
    userAssignedTenant: tenant.campusId,
    isSuperAdmin,
    isTenantContext: !!urlTenantId,
    // Whether current view matches user's assigned tenant
    isHomeTenant: urlTenantId === tenant.campusId,
  };
};

/**
 * Security Audit Logger
 * Call this when suspicious activity is detected
 */
export const logSecurityEvent = (event: {
  type: 'TENANT_MISMATCH' | 'UNAUTHORIZED_ACCESS' | 'TOKEN_EXPIRED';
  details: string;
  userId?: string;
  tenantId?: string;
}) => {
  const securityLog = {
    ...event,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  console.error('[SECURITY AUDIT]', securityLog);
  
  // Here you could also send to a security monitoring service
  // fetch('/api/security/log', { method: 'POST', body: JSON.stringify(securityLog) });
};
