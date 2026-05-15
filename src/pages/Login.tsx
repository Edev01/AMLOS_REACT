import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axios';
import { ENDPOINTS, buildFullUrl } from '../config/api.config';
import { AuthResponse, Role } from '../types';
import { ROLE_DASHBOARD_MAP } from '../types';
import axios from 'axios';

// Modern Education Illustration Component
const EducationIllustration: React.FC = () => (
  <svg viewBox="0 0 400 320" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
    {/* Background mesh gradient effect */}
    <defs>
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1E3A5F" stopOpacity="0.8" />
        <stop offset="50%" stopColor="#0B1120" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#1E3A5F" stopOpacity="0.7" />
      </linearGradient>
      <linearGradient id="blueGlow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
        <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.3" />
      </linearGradient>
      <linearGradient id="purpleAccent" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#A78BFA" />
      </linearGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    {/* Central Platform / Dashboard */}
    <ellipse cx="200" cy="260" rx="120" ry="20" fill="#1E3A5F" opacity="0.5" />
    <rect x="100" y="180" width="200" height="70" rx="12" fill="#1E3A5F" stroke="#3B82F6" strokeWidth="2" />
    <rect x="115" y="195" width="60" height="40" rx="6" fill="#0B1120" stroke="#3B82F6" strokeWidth="1" opacity="0.8" />
    <rect x="185" y="195" width="30" height="15" rx="3" fill="#3B82F6" opacity="0.6" />
    <rect x="185" y="215" width="30" height="15" rx="3" fill="#8B5CF6" opacity="0.6" />
    <rect x="225" y="195" width="60" height="40" rx="6" fill="#0B1120" stroke="#8B5CF6" strokeWidth="1" opacity="0.8" />
    
    {/* Connected School Buildings */}
    <g filter="url(#glow)">
      {/* Left School */}
      <rect x="40" y="140" width="50" height="60" rx="4" fill="#1E3A5F" stroke="#3B82F6" strokeWidth="2" />
      <rect x="50" y="155" width="12" height="15" rx="2" fill="#60A5FA" opacity="0.8" />
      <rect x="68" y="155" width="12" height="15" rx="2" fill="#60A5FA" opacity="0.8" />
      <rect x="50" y="175" width="12" height="15" rx="2" fill="#60A5FA" opacity="0.6" />
      <rect x="68" y="175" width="12" height="15" rx="2" fill="#60A5FA" opacity="0.6" />
      <polygon points="40,140 65,110 90,140" fill="#1E3A5F" stroke="#3B82F6" strokeWidth="2" />
      
      {/* Right School */}
      <rect x="310" y="140" width="50" height="60" rx="4" fill="#1E3A5F" stroke="#8B5CF6" strokeWidth="2" />
      <rect x="320" y="155" width="12" height="15" rx="2" fill="#A78BFA" opacity="0.8" />
      <rect x="338" y="155" width="12" height="15" rx="2" fill="#A78BFA" opacity="0.8" />
      <rect x="320" y="175" width="12" height="15" rx="2" fill="#A78BFA" opacity="0.6" />
      <rect x="338" y="175" width="12" height="15" rx="2" fill="#A78BFA" opacity="0.6" />
      <polygon points="310,140 335,110 360,140" fill="#1E3A5F" stroke="#8B5CF6" strokeWidth="2" />
    </g>
    
    {/* Connection Lines */}
    <path d="M90 170 Q 140 150, 200 180" stroke="url(#blueGlow)" strokeWidth="2" fill="none" strokeDasharray="5,5" opacity="0.8" />
    <path d="M310 170 Q 260 150, 200 180" stroke="url(#blueGlow)" strokeWidth="2" fill="none" strokeDasharray="5,5" opacity="0.8" />
    
    {/* Data/Analytics Elements */}
    <circle cx="200" cy="80" r="25" fill="#1E3A5F" stroke="#3B82F6" strokeWidth="2" filter="url(#glow)" />
    <path d="M185 80 L195 90 L215 70" stroke="#60A5FA" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    
    {/* Floating Data Points */}
    <circle cx="150" cy="60" r="8" fill="#3B82F6" opacity="0.6">
      <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" />
    </circle>
    <circle cx="250" cy="70" r="6" fill="#8B5CF6" opacity="0.6">
      <animate attributeName="opacity" values="0.6;1;0.6" dur="2.5s" repeatCount="indefinite" />
    </circle>
    <circle cx="280" cy="100" r="5" fill="#60A5FA" opacity="0.5">
      <animate attributeName="opacity" values="0.5;0.9;0.5" dur="2s" repeatCount="indefinite" />
    </circle>
    <circle cx="120" cy="90" r="4" fill="#A78BFA" opacity="0.5">
      <animate attributeName="opacity" values="0.5;0.8;0.5" dur="2.2s" repeatCount="indefinite" />
    </circle>
    
    {/* Progress Rings */}
    <path d="M160 120 A 20 20 0 0 1 180 130" stroke="#3B82F6" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M220 110 A 15 15 0 0 1 235 120" stroke="#8B5CF6" strokeWidth="3" fill="none" strokeLinecap="round" />
    
    {/* Central Hub Glow */}
    <circle cx="200" cy="215" r="8" fill="#3B82F6" filter="url(#glow)" opacity="0.9" />
  </svg>
);

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, user, getTenantDashboardPath, tenant } = useAuth();
  const navigate = useNavigate();
  const hasInput = email.trim().length > 0;

  // If already authenticated, redirect to their appropriate dashboard
  useEffect(() => {
    if (user?.role) {
      // Get tenant-specific dashboard path
      const dashboardPath = getTenantDashboardPath();
      if (dashboardPath) {
        navigate(dashboardPath, { replace: true });
      }
    }
  }, [user, tenant.campusId, navigate, getTenantDashboardPath]);

  useEffect(() => {
    const fontId = 'login-inter-font';
    if (document.getElementById(fontId)) return;

    const preconnectGoogle = document.createElement('link');
    preconnectGoogle.rel = 'preconnect';
    preconnectGoogle.href = 'https://fonts.googleapis.com';
    document.head.appendChild(preconnectGoogle);

    const preconnectGstatic = document.createElement('link');
    preconnectGstatic.rel = 'preconnect';
    preconnectGstatic.href = 'https://fonts.gstatic.com';
    preconnectGstatic.crossOrigin = 'anonymous';
    document.head.appendChild(preconnectGstatic);

    const interLink = document.createElement('link');
    interLink.id = fontId;
    interLink.rel = 'stylesheet';
    interLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(interLink);
  }, []);

  const validateFields = () => {
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) nextErrors.email = 'Username or email is required.';

    if (!password) nextErrors.password = 'Password is required.';

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) nextErrors.email = 'Username or email is required.';
    if (!password) nextErrors.password = 'Password is required.';
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setSubmitted(true);
      return;
    }
    setSubmitted(true);
    setIsLoading(true);

    // Real API authentication with multi-tenant support
    const emailValue = email.trim();
    try {
      // Backend expects 'email' field (as shown in Postman/backend docs)
      const payload = { email: emailValue, password };
      
      const loginEndpoint = ENDPOINTS.LOGIN;
      const fullUrl = buildFullUrl(loginEndpoint);
      
      console.log('[Login] Sending request:', { 
        endpoint: loginEndpoint,
        fullUrl: fullUrl,
        method: 'POST',
        payload: { email: emailValue, password: '***' } 
      });
      
      // Use centralized axios instance
      const response = await axiosInstance.post<AuthResponse>(loginEndpoint, payload);
      
      // Extract data from response (Postman format: response.data.data)
      const responseData = response.data.data;
      if (!responseData) {
        throw new Error('Invalid response format from server');
      }
      
      // Extract role and tenant information from various possible response structures
      const receivedRole = (responseData.user?.role || (response.data as any).role || '') as Role;
      
      // Extract campus_id from multiple possible locations in response
      const campusId = responseData.campus_id || 
                       responseData.user?.campus_id || 
                       (responseData.user as any)?.school_id || 
                       responseData.school_id || 
                       (response.data as any).campus_id || 
                       '';
      
      const campusName = responseData.user?.campus_name || (responseData.user as any)?.school_name || '';
      
      // IMPORTANT: login() is synchronous — it writes to localStorage and
      // sets the axios token BEFORE returning. Safe to navigate immediately.
      login(response.data, emailValue);
      
      // Log for debugging
      console.log('[Login] Auth Success:', {
        role: receivedRole,
        campusId,
        campusName,
        hasToken: !!responseData.tokens?.access,
      });
      
      // ─── Imperative navigation — calculate dashboard path directly ───
      let dashboardPath: string;
      
      if (receivedRole === 'SUPER_ADMIN' || receivedRole === 'ADMIN') {
        dashboardPath = '/admin/dashboard';
      } else if (receivedRole === 'SCHOOL') {
        dashboardPath = '/school/dashboard';
      } else if ((receivedRole === 'SCHOOL_ADMIN' || receivedRole === 'CAMPUS_ADMIN') && campusId) {
        dashboardPath = `/campus/${campusId}/dashboard`;
      } else {
        dashboardPath = campusId 
          ? `/campus/${campusId}/dashboard` 
          : (ROLE_DASHBOARD_MAP[receivedRole] || '/admin/dashboard');
      }
      
      console.log('[Login] Navigating to:', dashboardPath);
      navigate(dashboardPath, { replace: true });      
    } catch (err: unknown) {
      console.error('[Login] Error:', err);
      if (axios.isAxiosError(err)) {
        // FORCE LOG - Exact backend rejection reason
        console.error('BACKEND REJECTED US BECAUSE:', err.response?.data);
        
        // Log full error details for debugging
        console.error('[Login] Full Error:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          requestConfig: {
            url: err.config?.url,
            baseURL: err.config?.baseURL,
            method: err.config?.method,
            fullPath: err.config?.baseURL && err.config?.url 
              ? `${err.config.baseURL}${err.config.url}` 
              : 'unknown',
          }
        });
        
        // 400 = Bad Request (wrong payload format)
        // 401 = Unauthorized (wrong credentials)
        // 403 = Forbidden (account disabled)
        // 404 = Not Found (endpoint doesn't exist)
        const status = err.response?.status;
        let errorMessage = 'Login failed. Please try again.';
        
        if (status === 404) {
          errorMessage = 'Login service not found. Please contact support.';
        } else if (status === 400) {
          errorMessage = err.response?.data?.detail || 
                        err.response?.data?.message || 
                        err.response?.data?.username?.[0] ||
                        err.response?.data?.password?.[0] ||
                        'Invalid request format. Please check your credentials.';
        } else if (status === 401) {
          errorMessage = 'Invalid username or password.';
        } else if (status === 403) {
          errorMessage = 'Account is disabled or forbidden.';
        }
        
        setError(errorMessage);
      } else { 
        setError('An unexpected error occurred. Please try again.'); 
      }
    } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl overflow-hidden rounded-3xl bg-white shadow-[0_25px_80px_rgba(11,17,32,0.15)] font-['Inter']">
        {/* Left panel — Branding (hidden on mobile) */}
        <div className="relative hidden lg:flex lg:w-[45%] flex-col justify-between bg-[#0B1120] p-10 xl:p-14 overflow-hidden">
          {/* Geometric mesh gradient background */}
          <div className="absolute inset-0 opacity-40">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,#1E3A5F_0%,transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,#3B82F6_0%,transparent_40%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_30%,#8B5CF6_0%,transparent_35%)]" />
          </div>
          
          {/* Grid pattern overlay */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(#3B82F6 1px, transparent 1px), linear-gradient(90deg, #3B82F6 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }}
          />

          {/* Logo */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-3 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="grid h-10 w-10 place-content-center rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6]">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <p className="text-xl font-bold text-white">AMLOS</p>
                <p className="text-xs text-[#94A3B8]">Enterprise Platform</p>
              </div>
            </div>
          </div>

          {/* Main content with illustration */}
          <div className="relative z-10 flex-1 flex flex-col justify-center my-8">
            <div className="w-full max-w-sm mx-auto">
              <EducationIllustration />
            </div>
            
            <div className="mt-8 text-center">
              <h2 className="text-3xl xl:text-4xl font-bold text-white tracking-tight">
                Empowering{' '}
                <span className="bg-gradient-to-r from-[#60A5FA] to-[#A78BFA] bg-clip-text text-transparent">
                  Educational Excellence
                </span>
              </h2>
              <p className="mt-4 text-[#94A3B8] text-sm xl:text-base leading-relaxed max-w-sm mx-auto">
                One platform to manage your entire academic ecosystem. Connect schools, track progress, and drive success.
              </p>
            </div>
          </div>

          {/* Bottom stats */}
          <div className="relative z-10">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[#94A3B8]">Secure Connection</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <span className="text-[#64748B]">v2.4.0</span>
            </div>
          </div>
        </div>

        {/* Right panel — Login Form */}
        <div className="flex w-full lg:w-[55%] items-center justify-center bg-[#F8FAFC] px-6 py-8 sm:px-10 lg:px-12 xl:px-16">
          <div className="w-full max-w-md">
            {/* Mobile-only logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="grid h-10 w-10 place-content-center rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6]">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">AMLOS</p>
                <p className="text-xs text-slate-500">Enterprise Platform</p>
              </div>
            </div>

            <div className="text-center lg:text-left mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight">
                Sign in to your Account
              </h1>
              <p className="mt-2 text-[#64748B]">
                Enter your credentials to access your portal
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
                <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {/* Email field - Label above input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#475569] mb-2">
                  Email / Username
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="4" />
                      <path d="m2 8 8 5 8-5" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="text"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    placeholder="e.g. admin@school.com"
                    className={`w-full rounded-xl border bg-white pl-12 pr-4 py-3.5 text-base text-[#0F172A] outline-none transition-all duration-200 placeholder:text-[#94A3B8] ${
                      submitted && fieldErrors.email
                        ? 'border-red-400 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                        : 'border-slate-200 focus:border-[#3B82F6] focus:ring-4 focus:ring-[#3B82F6]/10 hover:border-slate-300'
                    }`}
                  />
                </div>
                {submitted && fieldErrors.email && (
                  <p className="mt-1.5 text-xs text-red-500">{fieldErrors.email}</p>
                )}
              </div>

              {/* Password field - Label above input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#475569] mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="10" rx="2" />
                      <path d="M7 11V8a5 5 0 0 1 10 0v3" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    placeholder="Enter your password"
                    className={`w-full rounded-xl border bg-white pl-12 pr-12 py-3.5 text-base text-[#0F172A] outline-none transition-all duration-200 placeholder:text-[#94A3B8] ${
                      submitted && fieldErrors.password
                        ? 'border-red-400 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                        : 'border-slate-200 focus:border-[#3B82F6] focus:ring-4 focus:ring-[#3B82F6]/10 hover:border-slate-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 3l18 18" />
                        <path d="M10.5 10.5a3 3 0 0 0 4 4" />
                        <path d="M9.88 5.09A10.94 10.94 0 0 1 12 5c5.5 0 10 5.5 10 7s-1.7 3.38-4.2 5.02" />
                        <path d="M6.61 6.61C3.95 8.3 2 10.88 2 12c0 1.18 2.17 4 5.2 5.75" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {submitted && fieldErrors.password && (
                  <p className="mt-1.5 text-xs text-red-500">{fieldErrors.password}</p>
                )}
              </div>

              {/* Remember me + Forgot password */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#475569]">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="h-5 w-5 rounded border border-slate-300 bg-white peer-checked:border-[#3B82F6] peer-checked:bg-[#3B82F6] transition-all" />
                    <svg 
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="3"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  Remember me
                </label>
                <Link 
                  to="/forgot-password" 
                  className="text-sm font-medium text-[#3B82F6] hover:text-[#2563EB] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Sign In Button with electric blue glow */}
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#1E40AF] via-[#3B82F6] to-[#1E40AF] px-6 py-4 text-base font-semibold text-white shadow-[0_4px_20px_rgba(59,130,246,0.4)] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(59,130,246,0.6)] hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100 disabled:hover:shadow-[0_4px_20px_rgba(59,130,246,0.4)]"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <svg className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14" />
                        <path d="M12 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </span>
                {/* Shimmer effect */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
              </button>
            </form>

            {/* Sign up link - increased margin top */}
            <p className="mt-10 text-center text-sm text-[#64748B]">
              Don't have an account?{' '}
              <Link to="/signup" className="font-semibold text-[#3B82F6] hover:text-[#2563EB] transition-colors">
                Create an Account
              </Link>
            </p>

            {/* Role indicator for enterprise feel */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-center gap-4 text-xs text-[#94A3B8]">
                <span className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
                  Super Admin
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" />
                  School Admin
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Teacher
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Login;
