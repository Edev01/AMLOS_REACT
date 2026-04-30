import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  Users,
  GraduationCap,
  BookOpen,
  TrendingUp,
  School,
  Calendar,
  Bell,
  Search,
  ChevronRight,
  MoreHorizontal,
  Award,
  Clock,
  BarChart3,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import DashboardLayout from '../components/DashboardLayout';

// Mock data for the School Admin Dashboard
const enrollmentData = [
  { month: 'Jan', students: 980 },
  { month: 'Feb', students: 1050 },
  { month: 'Mar', students: 1120 },
  { month: 'Apr', students: 1180 },
  { month: 'May', students: 1220 },
  { month: 'Jun', students: 1247 },
];

const subjectPerformanceData = [
  { subject: 'Math', score: 85 },
  { subject: 'Physics', score: 78 },
  { subject: 'Chemistry', score: 82 },
  { subject: 'English', score: 88 },
  { subject: 'Biology', score: 80 },
];

const classDistributionData = [
  { name: 'Grade 6', value: 35, color: '#8B5CF6' },
  { name: 'Grade 7', value: 28, color: '#3B82F6' },
  { name: 'Grade 8', value: 22, color: '#06B6D4' },
  { name: 'Grade 9', value: 15, color: '#10B981' },
];

const recentStudents = [
  { id: 1, name: 'Emma Johnson', grade: 'Grade 8', status: 'Active', progress: 92, avatar: 'EJ' },
  { id: 2, name: 'Liam Smith', grade: 'Grade 7', status: 'Active', progress: 88, avatar: 'LS' },
  { id: 3, name: 'Olivia Brown', grade: 'Grade 9', status: 'At Risk', progress: 65, avatar: 'OB' },
  { id: 4, name: 'Noah Wilson', grade: 'Grade 8', status: 'Active', progress: 90, avatar: 'NW' },
  { id: 5, name: 'Ava Martinez', grade: 'Grade 7', status: 'Excelling', progress: 98, avatar: 'AM' },
];

const quickActions = [
  { icon: Users, label: 'Add Student', color: 'from-blue-500 to-blue-600' },
  { icon: GraduationCap, label: 'Add Teacher', color: 'from-purple-500 to-purple-600' },
  { icon: BookOpen, label: 'Create Class', color: 'from-cyan-500 to-cyan-600' },
  { icon: Calendar, label: 'Schedule Event', color: 'from-emerald-500 to-emerald-600' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
};

const SchoolDashboard: React.FC = () => {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState('Good morning');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    setCurrentDate(date);
  }, []);

  const stats = [
    { label: 'Total Students', value: '1,247', change: '+12%', icon: Users, color: 'bg-blue-500' },
    { label: 'Teachers', value: '48', change: '+3', icon: GraduationCap, color: 'bg-cyan-500' },
    { label: 'Active Classes', value: '24', change: '0', icon: BookOpen, color: 'bg-purple-500' },
    { label: 'Avg Attendance', value: '94%', change: '+2%', icon: TrendingUp, color: 'bg-emerald-500' },
  ];

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {greeting},{' '}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {user?.username || 'School Admin'}
                </span>
              </h1>
              <p className="text-slate-500 mt-1">{currentDate}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students, teachers..."
                  className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none w-64 text-sm"
                />
              </div>
              <button className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all relative">
                <Bell className="h-5 w-5 text-slate-600" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {quickActions.map((action, index) => (
            <motion.button
              key={index}
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 transition-all group"
            >
              <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center`}>
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <span className="font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                {action.label}
              </span>
            </motion.button>
          ))}
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 hover:shadow-xl hover:shadow-blue-500/10 transition-all group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className={`h-12 w-12 rounded-xl ${stat.color} bg-opacity-10 flex items-center justify-center`}>
                    <stat.icon className={`h-6 w-6 ${stat.color.replace('bg-', 'text-')}`} />
                  </div>
                  <span className={`text-sm font-medium ${stat.change.startsWith('+') ? 'text-emerald-500' : stat.change === '0' ? 'text-slate-400' : 'text-rose-500'}`}>
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Charts Column */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Enrollment Trend */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Student Enrollment Trend</h3>
                  <p className="text-sm text-slate-500">Monthly student enrollment over time</p>
                </div>
                <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                  <MoreHorizontal className="h-5 w-5 text-slate-400" />
                </button>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={enrollmentData}>
                    <defs>
                      <linearGradient id="enrollmentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
                    <YAxis stroke="#64748B" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="students"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#8B5CF6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Subject Performance */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Subject Performance</h3>
                  <p className="text-sm text-slate-500">Average scores by subject</p>
                </div>
                <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                  <MoreHorizontal className="h-5 w-5 text-slate-400" />
                </button>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectPerformanceData}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" />
                        <stop offset="100%" stopColor="#8B5CF6" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="subject" stroke="#64748B" fontSize={12} />
                    <YAxis stroke="#64748B" fontSize={12} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Bar
                      dataKey="score"
                      fill="url(#barGradient)"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>

          {/* Right Column */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-6"
          >
            {/* Class Distribution */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Class Distribution</h3>
              <p className="text-sm text-slate-500 mb-6">Students by grade level</p>
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
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {classDistributionData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-600">{item.name}</span>
                    <span className="text-xs font-medium text-slate-900 ml-auto">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Students */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Recent Students</h3>
                  <p className="text-sm text-slate-500">Latest student activity</p>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                  View All
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                {recentStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
                  >
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                      {student.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 truncate">{student.name}</h4>
                      <p className="text-xs text-slate-500">{student.grade}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        student.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                        student.status === 'Excelling' ? 'bg-blue-100 text-blue-700' :
                        student.status === 'At Risk' ? 'bg-rose-100 text-rose-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {student.status}
                      </span>
                      <p className="text-xs text-slate-400 mt-1">{student.progress}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5" />
                <h3 className="font-semibold">Upcoming Events</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                  <div className="text-center min-w-[40px]">
                    <p className="text-xs text-blue-200">MAY</p>
                    <p className="text-lg font-bold">15</p>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Parent-Teacher Meeting</p>
                    <p className="text-xs text-blue-200">10:00 AM - 2:00 PM</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                  <div className="text-center min-w-[40px]">
                    <p className="text-xs text-blue-200">MAY</p>
                    <p className="text-lg font-bold">18</p>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Science Fair</p>
                    <p className="text-xs text-blue-200">9:00 AM - 4:00 PM</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SchoolDashboard;
