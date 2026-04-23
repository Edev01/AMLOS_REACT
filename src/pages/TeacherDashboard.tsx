import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />

      <div className="lg:pl-72">
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="rounded-xl border border-slate-300 bg-white p-2 text-slate-600 shadow-sm lg:hidden"
              >
                <Menu size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Teacher Dashboard</h1>
                <p className="text-sm text-slate-600 sm:text-base">
                  Welcome, {user?.email ?? 'Teacher'}
                </p>
              </div>
            </div>

            {/* Placeholder content */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-content-center rounded-2xl bg-indigo-100">
                <svg viewBox="0 0 24 24" className="h-8 w-8 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-5 9 5-9 5-9-5z" />
                  <path d="M5 10v5c0 1 3 3 7 3s7-2 7-3v-5" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900">Coming Soon</h2>
              <p className="mt-2 text-base text-slate-500">
                The Teacher module is under active development. Check back soon for class management, attendance, and grading features.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TeacherDashboard;
