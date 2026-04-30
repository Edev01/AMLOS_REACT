import React from 'react';
import { useParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useTenantContext } from '../routes/TenantProtectedRoute';

/**
 * Campus Dashboard - Tenant Isolated View
 * 
 * This dashboard only shows data for the specific campus/tenant
 * that the user has been assigned to. Super admins can access
 * any campus, but regular campus admins are restricted to their own.
 */
const CampusDashboard: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { tenant, isSuperAdmin } = useAuth();
  const { currentTenantName, isHomeTenant } = useTenantContext();

  // Determine display name
  const campusName = currentTenantName || `Campus ${tenantId}`;
  const isViewingOwnCampus = isHomeTenant;

  return (
    <DashboardLayout activePage="dashboard">
      {/* Tenant Context Banner */}
      <div className="mb-6 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 text-white">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-5 9 5-9 5-9-5z" />
                <path d="M5 10v5c0 1 3 3 7 3s7-2 7-3v-5" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{campusName}</h2>
              <p className="text-sm text-slate-600">
                {isViewingOwnCampus ? 'Your assigned campus' : "Viewing another campus (Super Admin)"}
              </p>
            </div>
          </div>
          {isSuperAdmin && (
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
              Super Admin Access
            </span>
          )}
        </div>
      </div>

      {/* Campus Stats Grid */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Students" 
          value="1,247" 
          trend="+5.2%" 
          icon="students" 
          color="blue"
        />
        <StatCard 
          title="Teachers" 
          value="48" 
          trend="+2" 
          icon="teachers" 
          color="green"
        />
        <StatCard 
          title="Active Classes" 
          value="36" 
          trend="-1" 
          icon="classes" 
          color="orange"
        />
        <StatCard 
          title="Attendance Today" 
          value="94.8%" 
          trend="+1.2%" 
          icon="attendance" 
          color="purple"
        />
      </div>

      {/* Campus Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Campus Overview</h3>
            <p className="text-slate-600">
              This is the isolated dashboard for <strong>{campusName}</strong>. 
              All data shown here is specific to this campus only.
            </p>
            <div className="mt-4 rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                <strong>Tenant ID:</strong> {tenantId}
              </p>
              <p className="text-sm text-slate-600">
                <strong>Your Campus:</strong> {tenant.campusId || 'Not assigned'}
              </p>
              <p className="text-sm text-slate-600">
                <strong>Access Level:</strong> {isSuperAdmin ? 'Super Admin (All Campuses)' : 'Campus Admin (Restricted)'}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Recent Activity</h3>
            <div className="space-y-3">
              <ActivityItem 
                action="New student enrolled"
                detail="Grade 9 - Section A"
                time="10 minutes ago"
              />
              <ActivityItem 
                action="Attendance marked"
                detail="Class 10-B by Ms. Sarah"
                time="30 minutes ago"
              />
              <ActivityItem 
                action="Exam results uploaded"
                detail="Mathematics - Grade 11"
                time="2 hours ago"
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Quick Actions</h3>
            <div className="space-y-2">
              <QuickActionButton label="Mark Attendance" icon="calendar" />
              <QuickActionButton label="Upload Results" icon="file" />
              <QuickActionButton label="Send Notice" icon="message" />
              <QuickActionButton label="View Reports" icon="chart" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Upcoming Events</h3>
            <div className="space-y-3">
              <EventItem 
                title="Parent Teacher Meeting"
                date="Tomorrow, 2:00 PM"
                type="meeting"
              />
              <EventItem 
                title="Annual Sports Day"
                date="March 15, 2024"
                type="event"
              />
              <EventItem 
                title="Midterm Exams Begin"
                date="March 20, 2024"
                type="exam"
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

// Sub-components
const StatCard: React.FC<{ title: string; value: string; trend: string; icon: string; color: string }> = 
  ({ title, value, trend, color }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-emerald-600">{trend}</p>
        </div>
        <div className={`h-12 w-12 rounded-xl ${colorClasses[color]} opacity-10`} />
      </div>
    </div>
  );
};

const ActivityItem: React.FC<{ action: string; detail: string; time: string }> = 
  ({ action, detail, time }) => (
  <div className="flex items-start gap-3 rounded-lg p-2 hover:bg-slate-50">
    <div className="h-2 w-2 mt-2 rounded-full bg-blue-500" />
    <div className="flex-1">
      <p className="text-sm font-medium text-slate-900">{action}</p>
      <p className="text-xs text-slate-500">{detail}</p>
      <p className="text-xs text-slate-400">{time}</p>
    </div>
  </div>
);

const QuickActionButton: React.FC<{ label: string; icon: string }> = ({ label }) => (
  <button className="w-full rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-blue-300 transition-colors">
    {label}
  </button>
);

const EventItem: React.FC<{ title: string; date: string; type: string }> = ({ title, date, type }) => {
  const typeColors: Record<string, string> = {
    meeting: 'bg-blue-100 text-blue-700',
    event: 'bg-green-100 text-green-700',
    exam: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="flex items-start gap-3 rounded-lg p-2 hover:bg-slate-50">
      <span className={`rounded px-2 py-1 text-xs font-medium ${typeColors[type] || 'bg-slate-100 text-slate-700'}`}>
        {type}
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{date}</p>
      </div>
    </div>
  );
};

export default CampusDashboard;
