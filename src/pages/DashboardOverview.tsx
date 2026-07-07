import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import api from '../api/services/api';
import {
  School, Users, GraduationCap, ClipboardList,
  TrendingUp, TrendingDown, ArrowUpRight, Plus,
  BookOpen, MapPin, RefreshCw, FileText, BarChart2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

/* helpers */
const parseList = (d: any, keys: string[]): any[] => {
  if (!d) return [];
  if (Array.isArray(d)) return d;
  for (const k of keys) {
    if (Array.isArray(d[k])) return d[k];
    if (d.data && Array.isArray(d.data[k])) return d.data[k];
  }
  if (Array.isArray(d.results)) return d.results;
  if (d.data && Array.isArray(d.data.results)) return d.data.results;
  if (Array.isArray(d.data)) return d.data;
  return [];
};

/* Sparkline */
const Sparkline: React.FC<{ data: number[]; color: string; fill?: string }> = ({ data, color, fill }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 80, H = 32;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={W} height={H} className="overflow-visible">
      {fill && <polygon points={`0,${H} ${pts} ${W},${H}`} fill={fill} opacity="0.18" />}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* Stat Card */
interface StatCardProps {
  label: string; value: string | number; icon: React.ReactNode; iconBg: string;
  sparkData: number[]; sparkColor: string; change?: number; loading?: boolean; onClick?: () => void;
}
const StatCard: React.FC<StatCardProps> = ({ label, value, icon, iconBg, sparkData, sparkColor, change, loading, onClick }) => {
  const up = (change ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.10)' }}
      onClick={onClick}
      className={`relative overflow-hidden bg-white dark:bg-[#1e2635] rounded-2xl p-5 border border-slate-100 dark:border-white/10 shadow-sm transition-all duration-300 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-[0.07]" style={{ background: sparkColor }} />
      <div className="flex items-start justify-between mb-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg} text-white shadow-md`}>{icon}</div>
        <Sparkline data={sparkData} color={sparkColor} fill={sparkColor} />
      </div>
      {loading
        ? <div className="h-8 w-24 rounded-lg bg-slate-100 dark:bg-white/10 animate-pulse mb-1" />
        : <p className="text-2xl font-extrabold text-slate-800 dark:text-white leading-none">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      }
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        {change !== undefined && !loading && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-500' : 'text-red-400'}`}>
            {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {up ? '+' : ''}{change}%
          </span>
        )}
      </div>
    </motion.div>
  );
};

/* Main */
const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: schoolsPayload, isLoading: loadingSchools, refetch: refetchSchools } = useQuery({
    queryKey: ['dashboard-schools-list'],
    queryFn: async () => {
      const res = await api.get('/api/auth/schools', { params: { page: 1, limit: 100, page_size: 100 } });
      const d = res.data;
      const count = d?.count ?? d?.total ?? d?.total_count ?? d?.data?.count ?? d?.data?.total ?? d?.data?.total_count;
      const list = parseList(d, ['schools', 'results', 'data']);
      return { list, count: count !== undefined && count !== null ? count : list.length };
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: usersData, isLoading: loadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['dashboard-users-admins'],
    queryFn: async () => {
      const res = await api.get('/api/auth/users', { params: { page: 1, limit: 1000, page_size: 1000 } });
      return parseList(res.data, ['users', 'results', 'data']);
    },
    staleTime: 5 * 60 * 1000,
  });

  const schoolsData = schoolsPayload?.list || [];
  const schoolCount = schoolsPayload?.count ?? schoolsData.length ?? null;

  // ─── Per-school student counts via /api/auth/schools/{id}/students ───
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [countsLoading, setCountsLoading] = useState(false);
  const fetchedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!schoolsData?.length) return;
    const toFetch = schoolsData.filter((s: any) => s.id && !fetchedIds.current.has(String(s.id)));
    if (toFetch.length === 0) return;

    setCountsLoading(true);
    let pending = toFetch.length;

    toFetch.forEach((s: any) => {
      const sid = String(s.id);
      fetchedIds.current.add(sid);
      api.get(`/api/auth/schools/${sid}/students`)
        .then((res) => {
          const d = res.data;
          const list = d?.data?.students ?? d?.students ?? d?.data ?? (Array.isArray(d) ? d : []);
          const count = Array.isArray(list) ? list.length : 0;
          setStudentCounts((prev) => ({ ...prev, [sid]: count }));
        })
        .catch(() => {
          setStudentCounts((prev) => ({ ...prev, [sid]: 0 }));
        })
        .finally(() => {
          pending--;
          if (pending <= 0) setCountsLoading(false);
        });
    });
  }, [schoolsData]);

  const displayStudents = useMemo(() => {
    if (Object.keys(studentCounts).length === 0) return null;
    return Object.values(studentCounts).reduce((sum, c) => sum + c, 0);
  }, [studentCounts]);

  const loadingStudents = loadingSchools || countsLoading;

  const refetch = () => {
    refetchSchools();
    refetchUsers();
  };

  const adminCount = useMemo(() => {
    if (!usersData) return null;
    return usersData.filter((u: any) => {
      const r = (u.role || u.role_name || '').toUpperCase();
      return r === 'ADMIN';
    }).length;
  }, [usersData]);

  const userCount = adminCount;

  const schoolsOnboardedData = useMemo(() => {
    if (!schoolsData?.length) return [];
    
    const monthlyCounts: Record<string, number> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    schoolsData.forEach((s: any) => {
      const dateStr = s.created_at || s.createdAt || s.created;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const m = months[d.getMonth()];
          const y = d.getFullYear();
          const key = `${m} ${y}`;
          monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
        }
      } else {
        // Fallback for mock data or missing dates
        const key = `Unknown`;
        monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
      }
    });
    
    const res = Object.entries(monthlyCounts).map(([label, count]) => {
      if (label === 'Unknown') return { label, count, timestamp: 0 };
      const [m, y] = label.split(' ');
      const mIdx = months.indexOf(m);
      return {
        label,
        count,
        timestamp: new Date(parseInt(y), mIdx, 1).getTime()
      };
    });
    
    res.sort((a, b) => a.timestamp - b.timestamp);
    
    return res.map(r => ({ month: r.label, count: r.count }));
  }, [schoolsData]);

  const seed = (base: number | null) =>
    Array.from({ length: 8 }, (_, i) => Math.max(0, (base ?? 10) - 3 + i + Math.round(Math.random() * 2)));

  const isLoading = loadingSchools || loadingStudents || loadingUsers;

  const quickActions = [
    { label: 'Add School', icon: <School size={16} />, color: 'bg-blue-500', path: '/admin/schools/add' },
    { label: 'Create Assessment', icon: <BookOpen size={16} />, color: 'bg-indigo-500', path: '/admin/assessments/create' },
    { label: 'Create Planner', icon: <ClipboardList size={16} />, color: 'bg-amber-500', path: '/admin/planners/create' },
    { label: 'CMS Dashboard', icon: <FileText size={16} />, color: 'bg-emerald-500', path: '/admin/cms' },
  ];

  return (
    <DashboardLayout activePage="dashboard">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard Overview</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-500/20 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-500/30">
                {user?.role?.replace('_', ' ') || 'Super Admin'}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Welcome back, <span className="font-semibold text-slate-700 dark:text-slate-200">{user?.username || 'Admin'}</span>! Here&apos;s your platform at a glance.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/15 transition shadow-sm"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard label="Total Schools" value={loadingSchools ? '—' : (schoolCount ?? '—')} icon={<School size={18} />} iconBg="bg-gradient-to-br from-blue-500 to-blue-600" sparkData={seed(schoolCount)} sparkColor="#3b82f6" change={12} loading={loadingSchools} onClick={() => navigate('/admin/schools')} />
        <StatCard label="Total Students" value={loadingStudents ? '—' : (displayStudents ?? '—')} icon={<Users size={18} />} iconBg="bg-gradient-to-br from-emerald-500 to-teal-500" sparkData={seed(displayStudents)} sparkColor="#10b981" change={8} loading={loadingStudents} />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Schools Onboarded Graph */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2 bg-white dark:bg-[#1e2635] rounded-2xl border border-slate-100 dark:border-white/10 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-white">Schools Onboarding</h2>
              <p className="text-xs text-slate-400 mt-0.5">Schools added per month</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/20 text-blue-500">
              <BarChart2 size={18} />
            </div>
          </div>
          {loadingSchools ? (
            <div className="h-[250px] w-full bg-slate-50 dark:bg-white/5 rounded-xl animate-pulse" />
          ) : schoolsOnboardedData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 h-[250px] text-slate-400">
              <School size={32} className="mb-2 opacity-30" />
              <p className="text-sm">No schools onboarded yet</p>
            </div>
          ) : (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={schoolsOnboardedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50}>
                    {schoolsOnboardedData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === schoolsOnboardedData.length - 1 ? '#3b82f6' : '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Right Panel */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="flex flex-col gap-5">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-[#1e2635] rounded-2xl border border-slate-100 dark:border-white/10 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800 dark:text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((a) => (
                <button key={a.label} onClick={() => a.path !== '#' && navigate(a.path)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 dark:border-white/10 hover:border-blue-200 dark:hover:border-blue-500/40 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all group">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${a.color} text-white shadow-md group-hover:scale-110 transition-transform`}>{a.icon}</div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 text-center leading-tight">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardOverview;
