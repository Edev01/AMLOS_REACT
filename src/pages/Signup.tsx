import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/services/api';
import { ROLE_DASHBOARD_MAP } from '../types';
import toast from 'react-hot-toast';

const Signup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role && ROLE_DASHBOARD_MAP[user.role]) {
      navigate(ROLE_DASHBOARD_MAP[user.role], { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const fontId = 'login-inter-font';
    if (document.getElementById(fontId)) return;
    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !username.trim() || !password) {
      setError('All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    // Real API signup and login
    try {
      await api.post('/api/auth/admin/signup', { email: email.trim(), username: username.trim(), password });
      toast.success('Account created! Logging you in...');
      const loginRes = await api.post('/api/auth/login', { username: username.trim(), password });
      login(loginRes.data, username.trim());
      navigate('/dashboard', { replace: true });
    } catch (err: any) { 
      setError(err?.response?.data?.detail || err?.response?.data?.message || 'Signup failed.'); 
    }
    finally { setIsLoading(false); }
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
            <h2 className="text-2xl font-bold mb-3">Join AMLOS Today</h2>
            <p className="text-sm leading-relaxed text-slate-200">
              Create your admin account and get started managing schools, students, and educational resources on the AMLOS platform.
            </p>
          </div>

          <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V8a5 5 0 0 1 10 0v3" />
            </svg>
            Admin-provisioned access only. No public registration.
          </div>
        </div>

        {/* Right panel — signup form */}
        <div className="order-2 flex w-full items-center justify-center bg-white px-6 py-8 sm:px-10 lg:w-[54%] lg:px-16">
          <div className="w-full max-w-xl">
            <div className="mb-8">
              <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Create Account</h2>
              <p className="mt-3 text-lg text-slate-500">Set up your admin credentials to get started</p>
            </div>

            {error && <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="signup-email" className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
                  <svg className="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <input id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="ml-3 w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400" />
                </div>
              </div>

              {/* Username */}
              <div>
                <label htmlFor="signup-username" className="mb-2 block text-sm font-semibold text-slate-700">Username</label>
                <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
                  <svg className="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input id="signup-username" type="text" value={username} onChange={e => setUsername(e.target.value)}
                    placeholder="adminuser"
                    className="ml-3 w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="signup-password" className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
                <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
                  <svg className="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <path d="M7 11V8a5 5 0 0 1 10 0v3" />
                  </svg>
                  <input id="signup-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="ml-3 w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400" />
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="ml-3 text-slate-500 hover:text-slate-700">
                    {showPassword ? (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l18 18"/><path d="M10.5 10.5a3 3 0 0 0 4 4"/></svg>
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="signup-confirm" className="mb-2 block text-sm font-semibold text-slate-700">Confirm Password</label>
                <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
                  <svg className="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <path d="M7 11V8a5 5 0 0 1 10 0v3" />
                  </svg>
                  <input id="signup-confirm" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="ml-3 w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400" />
                </div>
              </div>

              <button type="submit" disabled={isLoading}
                className="mt-3 w-full rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-70">
                {isLoading ? 'Creating Account…' : 'Create Account'}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Signup;
