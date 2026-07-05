import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { studentService } from '../api/services/studentService';
import { Student } from '../types';
import { Users, GraduationCap } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import { teacherService } from '../api/services/teacherService';
import { Teacher } from '../types';


const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
};

const SchoolDashboard: React.FC = () => {
  const { user, tenant } = useAuth();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('Good morning');
  const [currentDate, setCurrentDate] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const rawSchoolId = tenant.schoolId || user?.school_id || '';
  const schoolNameFromId =
    rawSchoolId && /[A-Za-z]/.test(String(rawSchoolId)) ? String(rawSchoolId) : '';
  const schoolDisplayName =
    tenant.schoolName ||
    user?.school_name ||
    (user as any)?.school?.school_name ||
    (user as any)?.school?.name ||
    localStorage.getItem('school_name') ||
    schoolNameFromId ||
    user?.email ||
    user?.username ||
    'School Admin';

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

  useEffect(() => {
    studentService.getStudents()
      .then(data => {
        if (Array.isArray(data)) setStudents(data);
      })
      .catch(err => {
        console.error('Failed to fetch students for dashboard:', err);
      });
      
    teacherService.getTeachers()
      .then(data => {
        if (Array.isArray(data)) setTeachers(data);
      })
      .catch(err => {
        console.error('Failed to fetch teachers for dashboard:', err);
      });
  }, []);


  const stats = [
    { label: 'Total Students', value: students.length.toLocaleString(), change: '+12%', icon: Users, color: 'bg-blue-500' },
    { label: 'Total Teachers', value: teachers.length.toLocaleString(), change: '0', icon: GraduationCap, color: 'bg-emerald-500' },
  ];

  const routePrefix = user?.campus_id ? `/campus/${user?.campus_id}` : '/school';

  const quickActions = [
    { icon: Users, label: 'Add Student', color: 'from-blue-500 to-blue-600', path: `${routePrefix}/students/add` },
    { icon: GraduationCap, label: 'Add Teacher', color: 'from-purple-500 to-purple-600', path: `${routePrefix}/teachers/add` },
  ];

  return (
    <DashboardLayout activePage="dashboard">
      {/* Greeting Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting},{' '}
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {schoolDisplayName}
          </span>
        </h1>
        <p className="text-slate-500 mt-1 text-sm">{currentDate}</p>
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
            onClick={() => action.path !== '#' && navigate(action.path)}
            className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 transition-all group"
          >
            <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center`}>
              <action.icon className="h-5 w-5 text-white" />
            </div>
            <span className="font-medium text-slate-700 group-hover:text-blue-600 transition-colors text-sm">
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
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
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
    </DashboardLayout>
  );
};

export default SchoolDashboard;
