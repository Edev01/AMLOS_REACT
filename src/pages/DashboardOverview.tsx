import React, { useEffect, useState } from 'react';
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
  const [schoolCount, setSchoolCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch real data from backend
    api.get('/api/auth/schools')
      .then((res) => {
        const data = res.data;
        const list = Array.isArray(data) ? data : data?.results ?? data?.data ?? [];
        setSchoolCount(list.length);
        setLoading(false);
      })
      .catch(() => {
        setSchoolCount(0);
        setLoading(false);
      });
  }, []);

  const stats = [
    { 
      label: 'Total Schools', 
      value: schoolCount || 248, 
      change: '+12.5%', 
      trend: 'up',
      icon: <School size={20} />, 
      gradient: 'from-accent-blue to-accent-indigo',
      sparkline: sparklineData.schools,
      sparkColor: '#3b82f6'
    },
    { 
      label: 'Total Students', 
      value: '45,234', 
      change: '+10.5%', 
      trend: 'up',
      icon: <Users size={20} />, 
      gradient: 'from-emerald-500 to-teal-500',
      sparkline: sparklineData.students,
      sparkColor: '#10b981'
    },
    { 
      label: 'Total Teachers', 
      value: '3,842', 
      change: '+8.5%', 
      trend: 'up',
      icon: <GraduationCap size={20} />, 
      gradient: 'from-accent-purple to-violet-500',
      sparkline: sparklineData.teachers,
      sparkColor: '#8b5cf6'
    },
    { 
      label: 'Total Quizzes', 
      value: '1,293', 
      change: '+5.5%', 
      trend: 'up',
      icon: <ClipboardList size={20} />, 
      gradient: 'from-rose-500 to-pink-500',
      sparkline: sparklineData.quizzes,
      sparkColor: '#f43f5e'
    },
    { 
      label: 'Planners', 
      value: '38,492', 
      change: '+15.2%', 
      trend: 'up',
      icon: <CalendarDays size={20} />, 
      gradient: 'from-amber-500 to-orange-500',
      sparkline: sparklineData.planners,
      sparkColor: '#f59e0b'
    },
  ];

  const quickActions = [
    { label: 'Add School', desc: 'Register new institution', icon: <School size={20} />, gradient: 'from-accent-blue to-accent-indigo', onClick: () => navigate('/schools/add') },
    { label: 'Create Quiz', desc: 'Build assessment', icon: <ClipboardList size={20} />, gradient: 'from-accent-purple to-violet-500', onClick: () => {} },
    { label: 'Upload', desc: 'Add materials', icon: <Upload size={20} />, gradient: 'from-emerald-500 to-teal-500', onClick: () => {} },
    { label: 'Broadcast', desc: 'Send message', icon: <Megaphone size={20} />, gradient: 'from-rose-500 to-pink-500', onClick: () => {} },
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {stats
          .filter(s => s.label !== 'Planners' || user?.role === 'SUPER_ADMIN')
          .map((s, index) => (
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

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        {/* Student Activity - Gradient Area Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3 glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-navy-800">Student Activity</h2>
              <p className="text-xs text-slate-400 mt-0.5">Monthly active student trend</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-blue/10 text-accent-blue">
              <Users size={18} />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ 
                  borderRadius: 12, 
                  border: 'none', 
                  boxShadow: '0 10px 40px -4px rgba(0,0,0,0.1)', 
                  fontSize: 13,
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(8px)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="students" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorStudents)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Quiz Performance - Donut with Center Text */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-navy-800">Quiz Performance</h2>
              <p className="text-xs text-slate-400 mt-0.5">Performance distribution</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-purple/10 text-accent-purple">
              <ClipboardList size={18} />
            </div>
          </div>
          <div className="flex items-center gap-6">
            {/* Legend */}
            <div className="space-y-3 shrink-0">
              {quizPerfData.map((d) => (
                <div key={d.name} className="flex items-center gap-3">
                  <GlowingDot color={d.color} />
                  <div>
                    <p className="text-xs font-medium text-slate-600">{d.name}</p>
                    <p className="text-sm font-bold text-navy-800">{d.value}%</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Donut */}
            <div className="flex-1 relative">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={quizPerfData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    cornerRadius={6}
                  >
                    {quizPerfData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: 12, 
                      border: 'none', 
                      boxShadow: '0 10px 40px -4px rgba(0,0,0,0.1)', 
                      fontSize: 13,
                      background: 'rgba(255,255,255,0.95)'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-bold text-navy-800">193</p>
                <p className="text-xs text-slate-400">Total</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Subjects - Rounded Bar Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-navy-800">Top Subjects</h2>
              <p className="text-xs text-slate-400 mt-0.5">Average performance</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <GraduationCap size={18} />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={subjectData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <YAxis 
                dataKey="subject" 
                type="category" 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                axisLine={false} 
                tickLine={false} 
                width={70}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: 12, 
                  border: 'none', 
                  boxShadow: '0 10px 40px -4px rgba(0,0,0,0.1)', 
                  fontSize: 13,
                  background: 'rgba(255,255,255,0.95)'
                }} 
                cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
              />
              <Bar 
                dataKey="score" 
                fill="url(#barGradient)" 
                radius={[0, 8, 8, 0]} 
                barSize={20}
              />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recent Activity - Animated List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
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
          <div className="space-y-4 max-h-[230px] overflow-y-auto pr-1">
            {recentActivity.map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
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

        {/* Quick Actions - Premium Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-6"
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-navy-800">Quick Actions</h2>
            <p className="text-xs text-slate-400 mt-0.5">Frequent operations</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((qa, index) => (
              <motion.button
                key={qa.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + index * 0.05 }}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={qa.onClick}
                className="flex flex-col items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-left transition-all hover:bg-white hover:shadow-soft-lg hover:border-slate-200 group"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${qa.gradient} text-white shadow-md group-hover:shadow-lg transition-shadow`}>
                  {qa.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy-700 flex items-center gap-1">
                    {qa.label}
                    <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                  <p className="text-[11px] text-slate-400 leading-tight">{qa.desc}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardOverview;
