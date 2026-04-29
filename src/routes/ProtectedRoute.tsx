import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role, ROLE_DASHBOARD_MAP } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, isLoading } = useAuth();

  // Show loading spinner while auth state is being hydrated from localStorage
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  // No authenticated user → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role mismatch: redirect user to their own correct dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const fallback = ROLE_DASHBOARD_MAP[user.role] ?? '/login';
    return <Navigate to={fallback} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
