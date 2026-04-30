import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role, ROLE_DASHBOARD_MAP, User } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, isLoading, isSuperAdmin, tenant } = useAuth();
  const location = useLocation();

  // Show loading spinner while auth state is being hydrated from localStorage
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  // No authenticated user → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // SUPER ADMIN BYPASS: Super admins can access any protected route
  // This allows Super Admins to navigate to any school's URL without 403
  const userAccessLevel = (user as User).access_level || (user as User).profile?.access_level;
  const isSuperAdminUser = isSuperAdmin || 
                           user.role === 'SUPER_ADMIN' || 
                           userAccessLevel === 'SUPER';
  
  // Check if user is effectively a School Admin (ADMIN role + has campus_id) or SCHOOL role
  const isSchoolAdminUser = (user.role === 'SCHOOL_ADMIN' || user.role === 'CAMPUS_ADMIN' || 
                             user.role === 'SCHOOL' ||
                             (user.role === 'ADMIN' && tenant.campusId));
  
  // Role check: If Super Admin, skip role restriction
  // If School Admin or SCHOOL role, check if allowedRoles includes any school-related role
  // Otherwise, enforce role-based access
  const effectiveRole = user.role;
  const roleAllowed = !allowedRoles || 
                      allowedRoles.includes(effectiveRole) || 
                      (user.role === 'SCHOOL' && allowedRoles?.includes('SCHOOL_ADMIN')) ||
                      (user.role === 'ADMIN' && isSchoolAdminUser && 
                       (allowedRoles?.includes('SCHOOL_ADMIN') || allowedRoles?.includes('CAMPUS_ADMIN')));
  
  if (!roleAllowed && !isSuperAdminUser) {
    // Redirect to appropriate dashboard based on role
    if (isSchoolAdminUser && tenant.campusId) {
      return <Navigate to={`/campus/${tenant.campusId}/dashboard`} replace />;
    }
    const fallback = ROLE_DASHBOARD_MAP[user.role] ?? '/login';
    return <Navigate to={fallback} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
