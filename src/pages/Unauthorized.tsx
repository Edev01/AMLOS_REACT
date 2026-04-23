import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_DASHBOARD_MAP } from '../types';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleGoBack = () => {
    if (user?.role && ROLE_DASHBOARD_MAP[user.role]) {
      navigate(ROLE_DASHBOARD_MAP[user.role], { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center font-['Inter']">
        {/* Icon */}
        <div className="mx-auto mb-6 grid h-20 w-20 place-content-center rounded-2xl bg-red-100">
          <svg viewBox="0 0 24 24" className="h-10 w-10 text-red-500" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="m4.93 4.93 14.14 14.14" />
          </svg>
        </div>

        <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight">403</h1>
        <h2 className="mt-2 text-xl font-bold text-slate-700">Access Denied</h2>
        <p className="mt-3 text-base text-slate-500 leading-relaxed">
          You don't have permission to access this page.
          <br />
          Contact your administrator if you believe this is an error.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={handleGoBack}
            className="rounded-2xl bg-indigo-600 px-6 py-3 text-base font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
          >
            Go to My Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-base font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
