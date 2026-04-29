import React from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout activePage="dashboard">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome, {user?.email ?? 'Teacher'}</p>
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-5 9 5-9 5-9-5z" />
            <path d="M5 10v5c0 1 3 3 7 3s7-2 7-3v-5" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Coming Soon</h2>
        <p className="mt-2 text-base text-gray-500">
          The Teacher module is under active development. Check back soon for class management, attendance, and grading features.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
