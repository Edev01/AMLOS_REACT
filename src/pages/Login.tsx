import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/services/api';
import { AuthResponse, Role, ROLE_DASHBOARD_MAP } from '../types';
import axios from 'axios';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const hasInput = email.trim().length > 0;

  // If already authenticated, redirect to their dashboard
  useEffect(() => {
    if (user?.role && ROLE_DASHBOARD_MAP[user.role]) {
      navigate(ROLE_DASHBOARD_MAP[user.role], { replace: true });
    }
  }, [user, navigate]);

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
    setSubmitted(true);
    setError('');
    if (!validateFields()) return;
    setIsLoading(true);

    // Payload normalization: backend expects `email` key
    const username = email.trim();

    try {
      const response = await api.post<AuthResponse>('/api/auth/login', { username, password });
      login(response.data, username);

      // Role-based strategic routing
      const receivedRole = (response.data.data?.user?.role || response.data.role) as Role;
      const dashboardPath = ROLE_DASHBOARD_MAP[receivedRole];

      if (dashboardPath) {
        navigate(dashboardPath, { replace: true });
      } else {
        // Unknown role — send to unauthorized so the user sees a clear message
        navigate('/unauthorized', { replace: true });
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (!err.response || err.code === 'ECONNABORTED' || err.message === 'Network Error') {
          setError('Login service is temporarily unavailable. Please try again later.');
        } else {
          const msg =
            err.response?.data?.detail ||
            err.response?.data?.message ||
            'Invalid credentials. Please try again.';
          setError(msg);
        }
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl overflow-hidden rounded-[28px] bg-white shadow-[0_18px_60px_rgba(2,8,23,0.16)] font-['Inter']">
        {/* Left panel — branding */}
        <div className="relative order-1 flex w-full flex-col justify-between bg-slate-900 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.16),transparent_34%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.2),transparent_36%),linear-gradient(135deg,#0f172a_0%,#111827_45%,#0b1022_100%)] p-6 text-white sm:p-10 lg:order-none lg:w-[46%] lg:p-12">
          <div>
            <div className="inline-flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-2 backdrop-blur-md">
              <div className="grid h-10 w-10 place-content-center rounded-xl bg-indigo-500">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-5 9 5-9 5-9-5z" />
                  <path d="M5 10v5c0 1 3 3 7 3s7-2 7-3v-5" />
                </svg>
              </div>
              <div>
                <p className="text-xl font-extrabold leading-none">AMLOS</p>
                <p className="text-sm text-slate-200">Admin Portal</p>
              </div>
            </div>
          </div>

          <div className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg sm:p-8">
            <div className="mb-6 flex items-center gap-4">
              <div className="h-12 w-12 overflow-hidden rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 p-[2px]">
                <div className="grid h-full w-full place-content-center rounded-full bg-slate-800 text-sm font-bold">SK</div>
              </div>
              <div>
                <p className="text-lg font-semibold">Muhammad Sameer Khan</p>
                <p className="text-sm text-slate-300">Founder, Catalog</p>
                <p className="text-xs text-slate-400">Web Design Agency</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-slate-200">
              "AMLOS has transformed how we run internal operations. The dashboard is elegant, fast, and effortless for our team."
            </p>
          </div>

          {/* Security badge */}
          <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V8a5 5 0 0 1 10 0v3" />
            </svg>
            Admin-provisioned access only. No public registration.
          </div>
        </div>

        {/* Right panel — login form */}
        <div className="order-2 flex w-full items-center justify-center bg-white px-6 py-8 sm:px-10 lg:w-[54%] lg:px-16">
          <div className="w-full max-w-xl">
            <div className="mb-10">
              <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-2">
                <div className="grid h-10 w-10 place-content-center rounded-xl bg-indigo-500">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-5 9 5-9 5-9-5z" />
                    <path d="M5 10v5c0 1 3 3 7 3s7-2 7-3v-5" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900">AMLOS</h1>
                  <p className="text-sm font-medium text-slate-500">Admin Portal</p>
                </div>
              </div>

              <h2 className="mt-8 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Welcome Back</h2>
              <p className="mt-3 text-lg text-slate-500">Sign in with your admin-provisioned credentials</p>
            </div>

            {error && <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Email / Username field */}
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
                  Username / Email
                </label>
                <div
                  className={`flex items-center rounded-2xl border bg-white px-4 py-3 shadow-sm transition ${
                    submitted && fieldErrors.email
                      ? 'border-red-400 ring-2 ring-red-100'
                      : 'border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100'
                  }`}
                >
                  <svg className="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    id="email"
                    type="text"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. newadmin_99 or you@example.com"
                    className="ml-3 w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  <div className={`ml-3 grid h-6 w-6 place-content-center rounded-full text-xs font-bold ${hasInput ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    ✓
                  </div>
                </div>
                {submitted && fieldErrors.email && <p className="mt-2 text-sm text-red-500">{fieldErrors.email}</p>}
              </div>

              {/* Password field */}
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <div
                  className={`flex items-center rounded-2xl border bg-white px-4 py-3 shadow-sm transition ${
                    submitted && fieldErrors.password
                      ? 'border-red-400 ring-2 ring-red-100'
                      : 'border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100'
                  }`}
                >
                  <svg className="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <path d="M7 11V8a5 5 0 0 1 10 0v3" />
                    <circle cx="12" cy="16" r="1.3" />
                  </svg>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="ml-3 w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="ml-3 text-slate-500 hover:text-slate-700"
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

                {submitted && fieldErrors.password && <p className="mt-1 text-sm text-red-500">{fieldErrors.password}</p>}
              </div>

              {/* Remember me + Forgot password */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Remember me (15 days)
                </label>
                <button type="button" className="text-sm font-semibold text-slate-700 hover:text-indigo-600">
                  Forgot password?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="mt-3 w-full rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            {/* Footer — no signup link. Admin-provisioned only. */}
            <p className="mt-7 text-center text-sm text-slate-400">
              Access is provisioned by your system administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Login;
