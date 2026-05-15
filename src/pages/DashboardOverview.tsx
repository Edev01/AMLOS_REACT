import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import { DashboardOverviewSkeleton } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import api from '../api/services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart,
  BarChart, Bar,
} from 'recharts';
import { 
  School, Users, GraduationCap, ClipboardList, CalendarDays, Plus, Upload, Megaphone,
  TrendingUp, ArrowUpRight, Sparkles
} from 'lucide-react';

/* ---------- static chart data ---------- */
const activityData = [
  { month: 'Jan', students: 8200 },
  { month: 'Feb', students: 12000 },
  { month: 'Mar', students: 13500 },
  { month: 'Apr', students: 14800 },
  { month: 'May', students: 16200 },
  { month: 'Jun', students: 19500 },
];

const quizPerfData = [
  { name: 'Good', value: 70, color: '#3b82f6' },
  { name: 'Excellent', value: 35, color: '#10b981' },
  { name: 'Below Average', value: 70, color: '#f43f5e' },
  { name: 'Average', value: 18, color: '#f59e0b' },
];

const subjectData = [
  { subject: 'Mathematics', score: 75 },
  { subject: 'Science', score: 82 },
  { subject: 'English', score: 68 },
  { subject: 'History', score: 60 },
  { subject: 'Geography', score: 72 },
  { subject: 'Computer', score: 65 },
];

const recentActivity = [
  { action: 'New school added', detail: 'Greenfield Academy', time: '2 minutes ago', color: '#10b981', type: 'success' },
  { action: 'Quiz completed', detail: 'Mathematics Assessment', time: '15 minutes ago', color: '#3b82f6', type: 'info' },
  { action: 'Content uploaded', detail: 'Physics Study Guide', time: '1 hour ago', color: '#8b5cf6', type: 'action' },
  { action: 'New teacher joined', detail: 'Sarah Johnson', time: '2 hours ago', color: '#10b981', type: 'success' },
  { action: 'Planner generated', detail: 'Annual Curriculum', time: '3 hours ago', color: '#f59e0b', type: 'warning' },
  { action: 'System update', detail: 'Version 2.4.0 deployed', time: '5 hours ago', color: '#64748b', type: 'neutral' },
];

// Sparkline data for stat cards
const sparklineData = {
  schools: [30, 35, 32, 38, 42, 45, 48, 52, 55, 58, 62, 65],
  students: [1200, 1350, 1280, 1420, 1580, 1650, 1720, 1890, 1950, 2100, 2250, 2400],
  teachers: [80, 85, 82, 88, 92, 95, 98, 102, 105, 108, 112, 115],
  quizzes: [150, 165, 158, 172, 185, 195, 205, 218, 225, 238, 245, 258],
  planners: [450, 480, 465, 495, 520, 545, 568, 590, 615, 640, 665, 690],
};

// Mini Sparkline Component
const MiniSparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 60;
    const y = 20 - ((val - min) / range) * 20;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="60" height="24" className="overflow-visible">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M0,20 L${points} L60,20 Z`}
        fill={`url(#gradient-${color})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Glowing Dot Component
const GlowingDot: React.FC<{ color: string }> = ({ color }) => (
  <span 
    className="w-2 h-2 rounded-full animate-pulse"
    style={{ 
      backgroundColor: color,
      boxShadow: `0 0 8px ${color}80`
    }} 
  />
);

const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: dashboardData, isLoading: loading } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: async () => {
      try {
        // Step 1: Fetch all schools
        const schoolsRes = await api.get('/api/auth/schools');
        
        const schoolsData = schoolsRes.data;
        const schoolsList = Array.isArray(schoolsData) 
          ? schoolsData 
          : schoolsData?.results ?? schoolsData?.data ?? [];
        
        const schoolCount = schoolsList.length;
        let studentCount = 0;

        // Step 2: For each school, fetch students via the per-school endpoint
        if (schoolsList.length > 0) {
          const studentPromises = schoolsList.map((school: any) =>
            api.get(`/api/auth/schools/${school.id}/students`)
              .then(res => {
                const data = res.data?.data?.students ?? res.data?.students ?? res.data?.data ?? res.data ?? [];
                return Array.isArray(data) ? data.length : 0;
              })
              .catch(() => 0) // Gracefully handle per-school failures
          );
          
          const counts = await Promise.all(studentPromises);
          studentCount = counts.reduce((sum, count) => sum + count, 0);
        }

        return { schoolCount, studentCount };
      } catch (err) {
        console.error("Dashboard fetch error", err);
        return { schoolCount: 0, studentCount: 0 };
      }
    }
  });

  const schoolCount = dashboardData?.schoolCount || 0;
  const studentCount = dashboardData?.studentCount || 0;

  const stats = [
    { 
      label: 'Total Schools', 
      value: schoolCount || 0, 
      change: '+12.5%', 
      trend: 'up',
      icon: <School size={20} />, 
      gradient: 'from-accent-blue to-accent-indigo',
      sparkline: sparklineData.schools,
      sparkColor: '#3b82f6'
    },
    { 
      label: 'Total Students', 
      value: studentCount.toLocaleString(), 
      change: '+10.5%', 
      trend: 'up',
      icon: <Users size={20} />, 
      gradient: 'from-emerald-500 to-teal-500',
      sparkline: sparklineData.students,
      sparkColor: '#10b981'
    },
  ];

  if (loading) {
    return (
      <DashboardLayout activePage="dashboard">
        <DashboardOverviewSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activePage="dashboard">
      {/* Page header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-navy-800">Dashboard Overview</h1>
          <span className="px-2 py-0.5 text-xs font-medium text-accent-blue bg-accent-blue/10 rounded-full border border-accent-blue/20">
            Super Admin
          </span>
        </div>
        <p className="text-sm text-slate-500">
          Welcome back! Here's what's happening with your platform today.
        </p>
      </motion.div>

      {/* Stat Cards with Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {stats.map((s, index) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02, y: -2 }}
            className="stat-card-premium group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${s.gradient} text-white shadow-lg group-hover:shadow-glow-blue transition-shadow`}>
                {s.icon}
              </div>
              <MiniSparkline data={s.sparkline} color={s.sparkColor} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1">{s.label}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-navy-800">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
                <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-500">
                  <TrendingUp size={12} />
                  {s.change}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity row */}
      <div className="grid grid-cols-1 gap-6">
        {/* Recent Activity - Animated List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-navy-800">Recent Activity</h2>
              <p className="text-xs text-slate-400 mt-0.5">Latest actions</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Sparkles size={18} />
            </div>
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {recentActivity.map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="flex items-start gap-3 group cursor-pointer hover:bg-slate-50/50 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
              >
                <div className="mt-0.5">
                  <GlowingDot color={item.color} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-navy-700 group-hover:text-accent-blue transition-colors">{item.action}</p>
                  <p className="text-xs text-slate-400">{item.detail} · {item.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardOverview;
