import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import api from '../api/services/api';
import { studyPlanService } from '../api/services/studyPlanService';
import { assessmentService } from '../api/services/assessmentService';
import { StatCardSkeleton, ChartSkeleton } from '../components/Skeleton';
import {
  School, ClipboardList, BookOpen,
  RefreshCw, FileText
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

// Helper to get chart data based on filter
const getChartData = (items: any[], filter: 'week' | 'month' | '6months') => {
  const data: any[] = [];
  const now = new Date();

  if (filter === 'week') {
    // Last 7 days including today
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      data.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: new Date(d.setHours(0, 0, 0, 0)).getTime(),
        value: 0
      });
    }
  } else if (filter === 'month') {
    // Last 4 weeks
    for (let i = 3; i >= 0; i--) {
      data.push({
        name: `Week ${4 - i}`,
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i * 7 + 7)).getTime(),
        end: new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i * 7)).getTime(),
        value: 0
      });
    }
  } else {
    // Last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      data.push({
        name: d.toLocaleString('default', { month: 'short' }),
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        value: 0
      });
    }
  }

  items.forEach(item => {
    const dateVal = item.created_at || item.createdAt || item.created;
    if (!dateVal) return;
    const itemDate = new Date(dateVal);
    const itemTime = itemDate.getTime();

    if (filter === 'week') {
      const itemDayStart = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate()).getTime();
      const match = data.find(d => d.date === itemDayStart);
      if (match) match.value += 1;
    } else if (filter === 'month') {
      const match = data.find(d => itemTime > d.start && itemTime <= d.end);
      if (match) match.value += 1;
    } else {
      const match = data.find(d => d.monthIndex === itemDate.getMonth() && d.year === itemDate.getFullYear());
      if (match) match.value += 1;
    }
  });

  return data;
};

// Helper to get items this month
const getThisMonthCount = (items: any[]) => {
  const now = new Date();
  return items.filter(item => {
    const dateVal = item.created_at || item.createdAt || item.created;
    if (!dateVal) return false;
    const d = new Date(dateVal);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
};

const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [schools, setSchools] = useState<any[]>([]);
  const [planners, setPlanners] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  
  const [schoolsCount, setSchoolsCount] = useState<number>(0);
  const [assessmentsCount, setAssessmentsCount] = useState<number>(0);
  const [plannersCount, setPlannersCount] = useState<number>(0);

  const [loading, setLoading] = useState(true);

  const [schoolFilter, setSchoolFilter] = useState<'week' | 'month' | '6months'>('6months');
  const [plannerFilter, setPlannerFilter] = useState<'week' | 'month' | '6months'>('6months');
  const [assessmentFilter, setAssessmentFilter] = useState<'week' | 'month' | '6months'>('6months');

  const CACHE_KEY = 'admin_dashboard_cache';

  const loadFromCache = () => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        setSchools(data.schoolsData || []);
        setSchoolsCount(data.schoolsTotal || 0);
        setPlanners(data.plannersData || []);
        setPlannersCount(data.plannersTotal || 0);
        setAssessments(data.assessmentsData || []);
        setAssessmentsCount(data.assessmentsTotal || 0);
        return true;
      }
    } catch (e) {
      console.error('Failed to load cache', e);
    }
    return false;
  };

  const fetchData = async (forceRefresh = false) => {
    let apiCompleted = false;

    if (forceRefresh) {
      setSchools([]);
      setPlanners([]);
      setAssessments([]);
      setLoading(true);

      // Flash skeleton loader for exactly 300ms, then show cached data if API is still loading
      setTimeout(() => {
        if (!apiCompleted) {
          loadFromCache();
        }
      }, 300);
    } else {
      const hasCache = loadFromCache();
      if (!hasCache) setLoading(true);
    }

    try {
      const [schoolsRes, plannersRes, assessmentsRes] = await Promise.all([
        api.get('/api/auth/schools', { params: { page: 1, limit: 100, page_size: 100 } }),
        studyPlanService.listPlans(),
        assessmentService.listTemplates(1)
      ]);
      apiCompleted = true;

      const schoolsData = schoolsRes.data?.data?.results || schoolsRes.data?.results || schoolsRes.data?.schools || [];
      const schoolsTotal = schoolsRes.data?.data?.count || schoolsRes.data?.count || schoolsData.length;
      
      const plannersDataRaw = plannersRes?.data || plannersRes || [];
      const plannersData = Array.isArray(plannersDataRaw) ? plannersDataRaw : [];
      const plannersTotal = Array.isArray(plannersDataRaw) ? plannersDataRaw.length : 0;

      const assessmentsData = assessmentsRes?.results || [];
      const assessmentsTotal = assessmentsRes?.count || assessmentsData.length;
      
      // Update State
      setSchools(schoolsData);
      setSchoolsCount(schoolsTotal);
      setPlanners(plannersData);
      setPlannersCount(plannersTotal);
      setAssessments(assessmentsData);
      setAssessmentsCount(assessmentsTotal);

      // Save to cache for instant loading next time
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        schoolsData, schoolsTotal,
        plannersData, plannersTotal,
        assessmentsData, assessmentsTotal
      }));
      
    } catch (error) {
      console.error("Error fetching dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const schoolsThisMonth = getThisMonthCount(schools);
  const plannersThisMonth = getThisMonthCount(planners);
  const assessmentsThisMonth = getThisMonthCount(assessments);

  const schoolChartData = getChartData(schools, schoolFilter);
  const plannerChartData = getChartData(planners, plannerFilter);
  const assessmentChartData = getChartData(assessments, assessmentFilter);

  const stats = [
    { label: 'Total Schools', value: schoolsCount.toLocaleString(), change: `+${schoolsThisMonth} this month`, icon: School, color: 'text-blue-600', bg: 'bg-blue-50', badgeColor: 'bg-emerald-100 text-emerald-700', path: '/admin/schools' },
    { label: 'Total Planners', value: plannersCount.toLocaleString(), change: `+${plannersThisMonth} this month`, icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50', badgeColor: 'bg-emerald-100 text-emerald-700', path: '/admin/planners' },
    { label: 'Total Assessments', value: assessmentsCount.toLocaleString(), change: `+${assessmentsThisMonth} this month`, icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50', badgeColor: 'bg-emerald-100 text-emerald-700', path: '/admin/assessments/templates' },
  ];

  const showSkeleton = loading && schools.length === 0;

  return (
    <DashboardLayout activePage="dashboard">
      <style>{`
        .recharts-wrapper, .recharts-surface, .recharts-cartesian-grid, .recharts-tooltip-wrapper, .recharts-responsive-container {
          outline: none !important;
        }
      `}</style>
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
            onClick={() => fetchData(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/15 transition shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      {showSkeleton ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div key={index} variants={itemVariants} onClick={() => navigate(stat.path)} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} dark:bg-opacity-10`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className={`px-2.5 py-1 text-[11px] font-bold rounded-md ${stat.badgeColor}`}>
                  {stat.change}
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stat.value}</h3>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Charts Grid */}
      {showSkeleton ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <ChartSkeleton key={i} />
          ))}
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* School Trend Chart */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Schools Onboarding</h3>
            <select 
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value as any)}
              className="text-sm font-medium bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-400 border-none rounded-lg px-3 py-1.5 outline-none cursor-pointer"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="6months">Last 6 Months</option>
            </select>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" className="focus:outline-none">
              <AreaChart data={schoolChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} style={{ outline: 'none' }}>
                <defs>
                  <linearGradient id="colorSchools" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-prose-body)' }}
                  cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSchools)" activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Planner Trend Chart */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Planners Creation</h3>
            <select 
              value={plannerFilter}
              onChange={(e) => setPlannerFilter(e.target.value as any)}
              className="text-sm font-medium bg-amber-50 text-amber-600 dark:bg-slate-700 dark:text-amber-400 border-none rounded-lg px-3 py-1.5 outline-none cursor-pointer"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="6months">Last 6 Months</option>
            </select>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" className="focus:outline-none">
              <AreaChart data={plannerChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} style={{ outline: 'none' }}>
                <defs>
                  <linearGradient id="colorPlanners" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-prose-body)' }}
                  cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="value" stroke="#d97706" strokeWidth={3} fillOpacity={1} fill="url(#colorPlanners)" activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Assessment Trend Chart */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Assessments Creation</h3>
            <select 
              value={assessmentFilter}
              onChange={(e) => setAssessmentFilter(e.target.value as any)}
              className="text-sm font-medium bg-indigo-50 text-indigo-600 dark:bg-slate-700 dark:text-indigo-400 border-none rounded-lg px-3 py-1.5 outline-none cursor-pointer"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="6months">Last 6 Months</option>
            </select>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" className="focus:outline-none">
              <AreaChart data={assessmentChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} style={{ outline: 'none' }}>
                <defs>
                  <linearGradient id="colorAssessments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-prose-body)' }}
                  cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorAssessments)" activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      </motion.div>
      )}
    </DashboardLayout>
  );
};

export default DashboardOverview;
