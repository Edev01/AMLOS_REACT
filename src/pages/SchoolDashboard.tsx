import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { studentService } from '../api/services/studentService';
import { teacherService } from '../api/services/teacherService';
import { assessmentService } from '../api/services/assessmentService';
import { Student, Teacher } from '../types';
import { Users, GraduationCap, ClipboardList, RefreshCw, Loader2 } from 'lucide-react';
import { StatCardSkeleton, ChartSkeleton } from '../components/Skeleton';
import DashboardLayout from '../components/DashboardLayout';
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
    const dateVal = item.created_at || item.hire_date || item.enrollment_date || item.date_joined;
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
    const dateVal = item.created_at || item.hire_date || item.enrollment_date || item.date_joined;
    if (!dateVal) return false;
    const d = new Date(dateVal);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
};

const SchoolDashboard: React.FC = () => {
  const { user, tenant } = useAuth();
  const [greeting, setGreeting] = useState('Good morning');
  const [currentDate, setCurrentDate] = useState('');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [submissionsCount, setSubmissionsCount] = useState<number>(0);
  const [submissionsThisMonth, setSubmissionsThisMonth] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [studentFilter, setStudentFilter] = useState<'week' | 'month' | '6months'>('6months');
  const [teacherFilter, setTeacherFilter] = useState<'week' | 'month' | '6months'>('6months');

  const rawSchoolId = tenant.schoolId || user?.school_id || '';
  const schoolDisplayName = tenant.schoolName || user?.school_name || (user as any)?.school?.school_name || 'School Dashboard';

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  const CACHE_KEY = 'school_dashboard_cache';

  const loadFromCache = () => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        setStudents(data.studentsData || []);
        setTeachers(data.teachersData || []);
        setSubmissionsCount(data.submissionsCount || 0);
        setSubmissionsThisMonth(data.submissionsThisMonth || 0);
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
      setStudents([]);
      setTeachers([]);
      setSubmissionsCount(0);
      setSubmissionsThisMonth(0);
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
      const [studentsRes, teachersRes, submissionsRes] = await Promise.all([
        studentService.getStudents(),
        teacherService.getTeachers(),
        assessmentService.listSubmissions(1)
      ]);
      apiCompleted = true;

      const studentsData = Array.isArray(studentsRes) ? studentsRes : [];
      const teachersData = Array.isArray(teachersRes) ? teachersRes : [];
      
      let submissionsTotalCount = 0;
      let thisMonthSubmissions = 0;
      
      if (submissionsRes && submissionsRes.count !== undefined) {
        submissionsTotalCount = submissionsRes.count;
        const resultsArray = submissionsRes.results || [];
        thisMonthSubmissions = getThisMonthCount(resultsArray.map((item: any) => ({ ...item, created_at: item.submitted_at || item.created_at })));
      }

      setStudents(studentsData);
      setTeachers(teachersData);
      setSubmissionsCount(submissionsTotalCount);
      setSubmissionsThisMonth(thisMonthSubmissions);

      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        studentsData,
        teachersData,
        submissionsCount: submissionsTotalCount,
        submissionsThisMonth: thisMonthSubmissions
      }));

    } catch (error) {
      console.error("Error fetching school dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const studentsThisMonth = getThisMonthCount(students);
  const teachersThisMonth = getThisMonthCount(teachers);

  const studentChartData = getChartData(students, studentFilter);
  const teacherChartData = getChartData(teachers, teacherFilter);

  const stats = [
    { label: 'Total Students', value: students.length.toLocaleString(), change: `+${studentsThisMonth} this month`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', badgeColor: 'bg-emerald-100 text-emerald-700' },
    { label: 'Total Teachers', value: teachers.length.toLocaleString(), change: `+${teachersThisMonth} this month`, icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-50', badgeColor: 'bg-emerald-100 text-emerald-700' },
    { label: 'Submissions', value: submissionsCount.toLocaleString(), change: `+${submissionsThisMonth} this month`, icon: ClipboardList, color: 'text-emerald-600', bg: 'bg-emerald-50', badgeColor: 'bg-emerald-100 text-emerald-700' },
  ];

  const showSkeleton = loading && students.length === 0;

  return (
    <DashboardLayout activePage="dashboard">
      <style>{`
        .recharts-wrapper, .recharts-surface, .recharts-cartesian-grid, .recharts-tooltip-wrapper, .recharts-responsive-container {
          outline: none !important;
        }
      `}</style>
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {greeting}, <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{schoolDisplayName}</span>
            </h1>
            <p className="text-slate-500 mt-1 text-sm">{currentDate}</p>
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
            <motion.div key={index} variants={itemVariants} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition">
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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <ChartSkeleton key={i} />
          ))}
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Student Trend Chart */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Student Onboarding Trends</h3>
            <select 
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value as any)}
              className="text-sm font-medium bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-400 border-none rounded-lg px-3 py-1.5 outline-none cursor-pointer"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="6months">Last 6 Months</option>
            </select>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" className="focus:outline-none">
              <AreaChart data={studentChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} style={{ outline: 'none' }}>
                <defs>
                  <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-prose-body)' }}
                  cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorStudents)" activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Teacher Trend Chart */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Teacher Onboarding Trends</h3>
            <select 
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value as any)}
              className="text-sm font-medium bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-400 border-none rounded-lg px-3 py-1.5 outline-none cursor-pointer"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="6months">Last 6 Months</option>
            </select>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" className="focus:outline-none">
              <AreaChart data={teacherChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} style={{ outline: 'none' }}>
                <defs>
                  <linearGradient id="colorTeachers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-prose-body)' }}
                  cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="value" stroke="#7C3AED" strokeWidth={3} fillOpacity={1} fill="url(#colorTeachers)" activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      </motion.div>
      )}
    </DashboardLayout>
  );
};

export default SchoolDashboard;
