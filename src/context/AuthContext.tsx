import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthResponse, Role, ROLE_DASHBOARD_MAP } from '../types';

interface AuthContextType {
  user: User | null;
  login: (data: AuthResponse, loggedInUsername?: string) => void;
  logout: () => void;
  getDashboardPath: () => string;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate auth state from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('role');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (data: AuthResponse, loggedInUsername?: string) => {
    const accessToken = data.data?.tokens?.access || data.access_token || data.access || '';
    const refreshToken = data.data?.tokens?.refresh || data.refresh_token || data.refresh || '';
    const role = (data.data?.user?.role || data.role) as Role;

    if (!role) {
      throw new Error('Login response did not include a role.');
    }

    if (accessToken) localStorage.setItem('access_token', accessToken);
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('role', role);

    const loggedInUser: User = data.data?.user || data.user || {
      id: '1',
      email: loggedInUsername || 'user@example.com',
      role,
    };

    // Ensure the role on the user object matches the top-level role
    loggedInUser.role = role;

    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    setUser(null);
  };

  const getDashboardPath = (): string => {
    if (!user?.role) return '/login';
    return ROLE_DASHBOARD_MAP[user.role] || '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, getDashboardPath, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};