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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
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

    // Signup — on success redirect to login (no auto-login to avoid field mismatch errors)
    try {
      await api.post('/api/auth/admin/signup', { email: email.trim(), username: username.trim(), password });
      toast.success('Account created successfully! Please sign in. 🎉');
      navigate('/login', { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        (typeof err?.response?.data === 'object'
          ? Object.values(err?.response?.data).flat().join(' ')
          : null) ||
        'Signup failed. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-100 p-4 sm:p-6 lg:p-8 flex items-center justify-center overflow-hidden">
      <div className="flex h-full w-full max-w-7xl max-h-[90vh] lg:max-h-[800px] overflow-hidden rounded-[28px] bg-white shadow-[0_18px_60px_rgba(2,8,23,0.16)] font-['Inter']">
        {/* Left panel — branding (hidden on mobile) */}
        <div className="relative hidden lg:flex lg:w-[46%] flex-col justify-between bg-blue-50 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.16),transparent_34%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.2),transparent_36%),linear-gradient(135deg,#eff6ff_0%,#dbeafe_45%,#bfdbfe_100%)] p-10 text-slate-900 h-full overflow-hidden">
          <div>
            <div className="inline-flex items-center gap-3 rounded-2xl bg-white/60 px-4 py-2 backdrop-blur-md shadow-sm border border-blue-100">
              <div className="grid h-10 w-10 place-content-center rounded-xl bg-indigo-500">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-5 9 5-9 5-9-5z" />
                  <path d="M5 10v5c0 1 3 3 7 3s7-2 7-3v-5" />
                </svg>
              </div>
              <div>
                <p className="text-xl font-extrabold leading-none text-slate-900">AMLOS</p>
                <p className="text-sm text-slate-600">Admin Portal</p>
              </div>
            </div>
          </div>

          <div className="my-auto rounded-3xl border border-blue-200 bg-white/50 p-8 shadow-xl backdrop-blur-lg">
            <h2 className="text-2xl font-bold mb-3 text-slate-900">Join AMLOS Today</h2>
            <p className="text-sm leading-relaxed text-slate-700">
              Create your admin account and get started managing schools, students, and educational resources on the AMLOS platform.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V8a5 5 0 0 1 10 0v3" />
            </svg>
            Admin-provisioned access only. No public registration.
          </div>
        </div>

        {/* Right panel — signup form */}
        <div className="w-full lg:w-[54%] bg-white overflow-y-auto h-full flex flex-col items-center px-6 py-8 sm:px-10 lg:px-16">
          <div className="w-full max-w-xl my-auto">
            {/* Mobile-only logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
              <div className="grid h-10 w-10 place-content-center rounded-xl bg-indigo-500">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-5 9 5-9 5-9-5z" />
                  <path d="M5 10v5c0 1 3 3 7 3s7-2 7-3v-5" />
                </svg>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 leading-none">AMLOS</p>
                <p className="text-xs text-slate-500">Admin Portal</p>
              </div>
            </div>

            <div className="mb-6 text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Create Account</h2>
              <p className="mt-1 text-sm text-slate-500">Set up your admin credentials to get started</p>
            </div>

            {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>}

            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {/* Email */}
              <div className="auth-input-group">
                <input
                  id="signup-email"
                  type="email"
                  placeholder=" "
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="auth-input"
                />
                <label htmlFor="signup-email" className="auth-user-label bg-white">Email</label>
              </div>

              {/* Username */}
              <div className="auth-input-group">
                <input
                  id="signup-username"
                  type="text"
                  placeholder=" "
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="auth-input"
                />
                <label htmlFor="signup-username" className="auth-user-label bg-white">Username</label>
              </div>

              {/* Password */}
              <div className="auth-input-group">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder=" "
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="auth-input pr-12"
                />
                <label htmlFor="signup-password" className="auth-user-label bg-white">Password</label>
                <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l18 18"/><path d="M10.5 10.5a3 3 0 0 0 4 4"/></svg>
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="auth-input-group">
                <input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder=" "
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="auth-input pr-12"
                />
                <label htmlFor="signup-confirm-password" className="auth-user-label bg-white">Confirm Password</label>
                <button type="button" onClick={() => setShowConfirmPassword(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirmPassword ? (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l18 18"/><path d="M10.5 10.5a3 3 0 0 0 4 4"/></svg>
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>

              <button type="submit" disabled={isLoading}
                className="mt-2 w-full rounded-2xl bg-indigo-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-70">
                {isLoading ? 'Creating Account…' : 'Create Account'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-500">
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
