import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useTenantContext } from '../routes/TenantProtectedRoute';
import api from '../api/services/api';
import toast from 'react-hot-toast';

// Recharts imports for charts
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Mock data for charts - replace with API calls
const enrollmentData = [
  { month: 'Jul', students: 850 },
  { month: 'Aug', students: 920 },
  { month: 'Sep', students: 1050 },
  { month: 'Oct', students: 1100 },
  { month: 'Nov', students: 1150 },
  { month: 'Dec', students: 1247 },
];

const subjectPerformanceData = [
  { subject: 'Math', score: 78 },
  { subject: 'Physics', score: 82 },
  { subject: 'Chemistry', score: 85 },
  { subject: 'English', score: 88 },
  { subject: 'History', score: 75 },
];

const classDistributionData = [
  { name: 'Grade 9', value: 35, color: '#8B5CF6' },
  { name: 'Grade 10', value: 25, color: '#3B82F6' },
  { name: 'Grade 11', value: 22, color: '#10B981' },
  { name: 'Grade 12', value: 18, color: '#F59E0B' },
];

const recentStudents = [
  { id: 1, name: 'Emma Johnson', grade: 'Grade 10 - A', status: 'Active', progress: 92 },
  { id: 2, name: 'Liam Smith', grade: 'Grade 9 - B', status: 'Active', progress: 85 },
  { id: 3, name: 'Olivia Brown', grade: 'Grade 11 - A', status: 'Warning', progress: 68 },
  { id: 4, name: 'Noah Wilson', grade: 'Grade 10 - C', status: 'Active', progress: 90 },
  { id: 5, name: 'Ava Martinez', grade: 'Grade 12 - A', status: 'Active', progress: 95 },
];

interface StatsData {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  avgPerformance: number;
  studentTrend: number;
  teacherTrend: number;
  classTrend: number;
  performanceTrend: number;
}

/**
 * School Admin Dashboard - Tenant Isolated Portal
 * 
 * This dashboard provides a secure, tenant-isolated view for School Admins.
 * It displays campus-specific metrics, charts, and recent activity.
 * Super Admins can access this view for any campus via bypass.
 */
const SchoolAdminDashboard: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { tenant, user, isSuperAdmin } = useAuth();
  const { currentTenantName, isHomeTenant } = useTenantContext();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData>({
    totalStudents: 1247,
    totalTeachers: 48,
    totalClasses: 36,
    avgPerformance: 84,
    studentTrend: 5.2,
    teacherTrend: 2,
    classTrend: -1,
    performanceTrend: 1.2,
  });

  // Debug logging
  useEffect(() => {
    console.log('[SchoolAdminDashboard] Auth Debug:', {
      tenantId,
      userRole: user?.role,
      userCampusId: user?.campus_id,
      tenantCampusId: tenant.campusId,
      isSuperAdmin,
      isHomeTenant,
      currentTenantName,
    });
  }, [tenantId, user, tenant, isSuperAdmin, isHomeTenant, currentTenantName]);

  // Simulate API data fetch
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // In production, replace with actual API call
        // const response = await api.get(`/api/campus/${tenantId}/dashboard`);
        // setStats(response.data);
        
        // Simulate loading
        setTimeout(() => {
          setLoading(false);
        }, 800);
      } catch (err) {
        toast.error('Failed to load dashboard data');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [tenantId]);

  const campusName = currentTenantName || `Campus ${tenantId}`;
  const isViewingOwnCampus = isHomeTenant;

  if (loading) {
    return (
      <DashboardLayout activePage="dashboard">
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            <p className="text-sm text-slate-500">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activePage="dashboard">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">
              Welcome back! Here&apos;s what&apos;s happening today at {campusName}
            </p>
          </div>
          {isSuperAdmin && !isViewingOwnCampus && (
            <span className="rounded-full bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700">
              Viewing as Super Admin
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Students"
          value={stats.totalStudents.toLocaleString()}
          trend={`↑ ${stats.studentTrend}%`}
          trendUp={stats.studentTrend > 0}
          icon="students"
          gradient="from-blue-500 to-blue-600"
        />
        <StatCard
          title="Teachers"
          value={stats.totalTeachers.toString()}
          trend={`↑ ${stats.teacherTrend}`}
          trendUp={stats.teacherTrend > 0}
          icon="teachers"
          gradient="from-cyan-500 to-cyan-600"
        />
        <StatCard
          title="Classes"
          value={stats.totalClasses.toString()}
          trend={`${stats.classTrend > 0 ? '↑' : '↓'} ${Math.abs(stats.classTrend)}`}
          trendUp={stats.classTrend > 0}
          icon="classes"
          gradient="from-violet-500 to-violet-600"
        />
        <StatCard
          title="Avg Performance"
          value={`${stats.avgPerformance}%`}
          trend={`↑ ${stats.performanceTrend}%`}
          trendUp={stats.performanceTrend > 0}
          icon="performance"
          gradient="from-pink-500 to-rose-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Student Enrollment Trend */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Student Enrollment Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={enrollmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis 
                  dataKey="month" 
                  stroke="#64748B" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#64748B" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="students" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subject Performance */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Subject Performance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis 
                  dataKey="subject" 
                  stroke="#64748B" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#64748B" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value) => [`${value}%`, 'Score']}
                />
                <Bar 
                  dataKey="score" 
                  fill="url(#subjectGradient)" 
                  radius={[8, 8, 0, 0]}
                />
                <defs>
                  <linearGradient id="subjectGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section: Class Distribution & Recent Students */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Class Distribution</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={classDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {classDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value, name) => [`${value}%`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {classDistributionData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-slate-600">{item.name} {item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Students */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Recent Students</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {recentStudents.map((student) => (
              <div 
                key={student.id} 
                className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                    {student.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{student.name}</p>
                    <p className="text-sm text-slate-500">{student.grade}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    student.status === 'Active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }}`}>
                    {student.status}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                        style={{ width: `${student.progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{student.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security Notice for Non-Home Campus View */}
      {!isViewingOwnCampus && (
        <div className="mt-8 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800">
            <strong>Security Notice:</strong> You are viewing data for a campus other than your assigned campus. 
            Some actions may be restricted.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: 'students' | 'teachers' | 'classes' | 'performance';
  gradient: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, trend, trendUp, icon, gradient }) => {
  const icons = {
    students: (
      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    teachers: (
      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    classes: (
      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    performance: (
      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
          <p className={`text-xs font-medium mt-2 ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend} from last month
          </p>
        </div>
        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
          {icons[icon]}
        </div>
      </div>
    </div>
  );
};

export default SchoolAdminDashboard;
