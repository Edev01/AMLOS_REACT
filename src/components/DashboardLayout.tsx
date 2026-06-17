import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  Menu, 
  X, 
  Command, 
  LayoutDashboard, 
  School, 
  Users, 
  ClipboardList,
  CalendarDays,
  FileText,
  Settings,
  ArrowUpRight,
  Sparkles,
  Building2,
  LogOut,
  ChevronDown,
  Shield,
  User,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useIsFetching } from '@tanstack/react-query';
import Sidebar from './Sidebar';
import SchoolAdminSidebar from './SchoolAdminSidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activePage?: string;
}

// Search items builder — paths depend on user role
const buildSearchItems = (role: string | undefined, campusId?: string | null) => {
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isSchoolAdmin = role === 'SCHOOL_ADMIN' || role === 'CAMPUS_ADMIN';
  const isSchool = role === 'SCHOOL';

  const dashPath = isAdmin
    ? '/admin/dashboard'
    : isSchoolAdmin
    ? `/campus/${campusId || localStorage.getItem('campus_id') || 'unknown'}/dashboard`
    : isSchool
    ? '/school/dashboard'
    : '/admin/dashboard';

  const plannersPath = isAdmin
    ? '/admin/planners'
    : isSchoolAdmin
    ? `/campus/${campusId || localStorage.getItem('campus_id') || 'unknown'}/planners`
    : isSchool
    ? '/school/planners'
    : '/admin/planners';

  const studentsPath = isSchoolAdmin
    ? `/campus/${campusId || localStorage.getItem('campus_id') || 'unknown'}/students`
    : '/school/students';

  const teachersPath = isSchoolAdmin
    ? `/campus/${campusId || localStorage.getItem('campus_id') || 'unknown'}/teachers`
    : '/school/teachers';

  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} />, path: dashPath, roles: ['all'] },
    { id: 'schools', label: 'All Schools', icon: <School size={16} />, path: '/admin/schools', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { id: 'add-school', label: 'Add School', icon: <School size={16} />, path: '/admin/schools/add', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { id: 'planners', label: 'All Planners', icon: <CalendarDays size={16} />, path: plannersPath, roles: ['SUPER_ADMIN', 'ADMIN', 'SCHOOL_ADMIN', 'CAMPUS_ADMIN'] },
    { id: 'create-planner', label: 'Create Planner', icon: <ClipboardList size={16} />, path: `${plannersPath}/create`, roles: ['SUPER_ADMIN', 'ADMIN', 'SCHOOL_ADMIN', 'CAMPUS_ADMIN'] },
    { id: 'cms-dashboard', label: 'CMS Dashboard', icon: <FileText size={16} />, path: '/admin/cms', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { id: 'cms-classes', label: 'All Classes', icon: <FileText size={16} />, path: '/admin/cms/classes', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { id: 'cms-subjects', label: 'All Subjects', icon: <FileText size={16} />, path: '/admin/cms/subjects', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { id: 'cms-chapters', label: 'All Chapters', icon: <FileText size={16} />, path: '/admin/cms/chapters', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { id: 'cms-slos', label: 'All SLOs', icon: <FileText size={16} />, path: '/admin/cms/slos', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { id: 'all-students', label: 'All Students', icon: <Users size={16} />, path: studentsPath, roles: ['SCHOOL', 'SCHOOL_ADMIN', 'CAMPUS_ADMIN'] },
    { id: 'add-student', label: 'Add Student', icon: <Users size={16} />, path: `${studentsPath}/add`, roles: ['SCHOOL', 'SCHOOL_ADMIN', 'CAMPUS_ADMIN'] },
    { id: 'all-teachers', label: 'All Teachers', icon: <Users size={16} />, path: teachersPath, roles: ['SCHOOL', 'SCHOOL_ADMIN', 'CAMPUS_ADMIN'] },
    { id: 'add-teacher', label: 'Add Teacher', icon: <Users size={16} />, path: `${teachersPath}/add`, roles: ['SCHOOL', 'SCHOOL_ADMIN', 'CAMPUS_ADMIN'] },
  ];

  return items.filter(item =>
    item.roles.includes('all') || item.roles.includes(role || '')
  );
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, activePage }) => {
  const { user, isSuperAdmin, tenant, logout } = useAuth();
  const navigate = useNavigate();
  const isFetching = useIsFetching();
  const location = useLocation();
  useEffect(() => { if (window.innerWidth < 1024) setSidebarCollapsed(true); }, [location.pathname]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 1024);
  
  // Handle responsive sidebar collapse
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Determine which sidebar to show based on route
  const isSchoolAdminRoute = location.pathname.startsWith('/campus/');
  const useSchoolAdminSidebar = isSchoolAdminRoute && !isSuperAdmin;
  const [commandOpen, setCommandOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  
  const initials = (user?.username || user?.email || 'AK')
    .split(/[@.\s]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Command+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
      if (e.key === 'Escape') {
        setCommandOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when command palette opens
  useEffect(() => {
    if (commandOpen && commandInputRef.current) {
      setTimeout(() => commandInputRef.current?.focus(), 100);
    }
  }, [commandOpen]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const roleLabelMap: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Admin',
    SCHOOL_ADMIN: 'School Admin',
    CAMPUS_ADMIN: 'Campus Admin',
    SCHOOL: 'School',
    TEACHER: 'Teacher',
  };
  const roleLabel = roleLabelMap[user?.role || ''] || 'Admin';

  const searchItems = buildSearchItems(
    user?.role,
    (tenant as any)?.campusId || localStorage.getItem('campus_id')
  );

  const filteredItems = searchItems
    .filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleNavigate = useCallback((path: string) => {
    setCommandOpen(false);
    setSearchQuery('');
    if (path !== '#') {
      navigate(path);
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-surface-light font-sans relative">
      {/* Global Top-Bar Progress Loader for Background Fetching */}
      {isFetching > 0 && (
        <div className="fixed top-0 left-0 w-full h-1 bg-blue-100 z-[100]">
          <motion.div
            className="h-full bg-blue-600"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{
              duration: 1.5,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          />
        </div>
      )}

      {/* Mobile overlay */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" 
            onClick={() => setSidebarCollapsed(true)} 
          />
        )}
      </AnimatePresence>

      {/* Command Palette Modal */}
      <AnimatePresence>
        {commandOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-navy-900/60 backdrop-blur-sm"
            onClick={() => setCommandOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-soft-xl overflow-hidden border border-slate-200/60"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
                <Search size={20} className="text-slate-400" />
                <input
                  ref={commandInputRef}
                  type="text"
                  placeholder="Search commands..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 text-lg text-slate-700 placeholder:text-slate-400 outline-none bg-transparent"
                />
                <kbd className="px-2 py-1 text-xs font-medium text-slate-400 bg-slate-100 rounded border border-slate-200">
                  ESC
                </kbd>
              </div>
              
              {/* Results */}
              <div className="max-h-[400px] overflow-y-auto py-2">
                {filteredItems.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-400">
                    <Sparkles size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No results found for "{searchQuery}"</p>
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Quick Navigation
                    </div>
                    {filteredItems.map((item, index) => (
                      <motion.button
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handleNavigate(item.path)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-accent-blue/10 group-hover:text-accent-blue transition-colors">
                            {item.icon}
                          </div>
                          <span className="text-sm font-medium text-slate-700">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">Jump to</span>
                          <ArrowUpRight size={14} className="text-slate-400" />
                        </div>
                      </motion.button>
                    ))}
                  </>
                )}
              </div>
              
              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200">↑↓</kbd>
                    <span>to navigate</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200">↵</kbd>
                    <span>to select</span>
                  </span>
                </div>
                <span>Command Palette</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar — always visible */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-all duration-300 translate-x-0 ${
          sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        {useSchoolAdminSidebar ? (
          <SchoolAdminSidebar activePage={activePage} collapsed={sidebarCollapsed} />
        ) : (
          <Sidebar activePage={activePage} collapsed={sidebarCollapsed} />
        )}
      </div>

      {/* Main content area */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-[72px]' : 'ml-[72px] lg:ml-[260px]'}`}>
        {/* Top navigation bar with Glassmorphism */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={`sticky top-0 z-20 flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
            scrolled 
              ? 'bg-white/80 backdrop-blur-xl shadow-soft border-b border-slate-200/50' 
              : 'bg-white/50 backdrop-blur-sm border-b border-transparent'
          }`}
        >
          {/* Left — Mobile hamburger + Desktop collapse toggle */}
          <div className="flex items-center gap-2">
            {/* Toggle sidebar button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setSidebarCollapsed(p => !p)}
              className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 transition-colors"
            >
              {sidebarCollapsed ? <Menu size={20} className="lg:hidden" /> : <X size={20} className="lg:hidden" />}
              {sidebarCollapsed ? <ChevronsRight size={18} className="hidden lg:block" /> : <ChevronsLeft size={18} className="hidden lg:block" />}
            </motion.button>
          </div>

          {/* Command+K Search */}
          <div className="hidden sm:flex flex-1 max-w-md mx-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCommandOpen(true)}
              className="relative w-full group"
            >
              <div className="relative flex items-center">
                <Search size={16} className="absolute left-3.5 text-slate-400 transition-colors group-hover:text-accent-blue" />
                <div className="w-full rounded-xl border border-slate-200/60 bg-slate-50/80 backdrop-blur-sm py-2.5 pl-10 pr-20 text-sm text-slate-600 outline-none transition-all duration-200 text-left hover:bg-white hover:border-accent-blue/30 hover:shadow-soft">
                  Search schools, teachers, quizzes...
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-100 rounded border border-slate-200">
                    <Command size={10} />
                    <span>K</span>
                  </kbd>
                </div>
              </div>
            </motion.button>
          </div>

          {/* Right section — notifications + profile dropdown */}
          <div className="flex items-center gap-2">
            {/* Bell */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            </motion.button>

            {/* Profile Dropdown */}
            <div ref={profileRef} className="relative pl-2 border-l border-slate-200">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setProfileOpen(p => !p)}
                className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {/* Text (hidden on xs) */}
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{roleLabel}</p>
                  <p className="text-[11px] text-slate-400 leading-tight">{user?.email || 'admin@eduadmin.com'}</p>
                </div>
                {/* Avatar */}
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue to-accent-indigo text-xs font-bold text-white shadow-glow-blue">
                  {initials || 'AK'}
                </div>
                <ChevronDown
                  size={14}
                  className={`hidden sm:block text-slate-400 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}
                />
              </motion.button>

              {/* Dropdown Panel */}
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="absolute right-0 top-[calc(100%+8px)] w-72 rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.12)] border border-slate-200/80 overflow-hidden z-50"
                  >
                    {/* Header */}
                    <div className="px-4 pt-4 pb-3 bg-gradient-to-br from-accent-blue/5 to-accent-indigo/5 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue to-accent-indigo text-sm font-bold text-white shadow-glow-blue">
                          {initials || 'AK'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {user?.username || roleLabel}
                          </p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email || 'admin@eduadmin.com'}</p>
                          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-blue/10 text-accent-blue">
                            {isSuperAdmin ? <Shield size={9} /> : <User size={9} />}
                            {roleLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1.5">
                      {/* Settings removed per user request */}
                    </div>

                    {/* Logout */}
                    <div className="py-1.5">
                      <button
                        onClick={() => { setProfileOpen(false); handleLogout(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors group"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-500 group-hover:bg-rose-100 transition-colors">
                          <LogOut size={15} />
                        </div>
                        <div>
                          <p className="font-semibold text-left">Sign out</p>
                          <p className="text-[11px] text-rose-400">Log out of your account</p>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.header>

        {/* Page content with animations */}
        <motion.main 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="p-4 sm:p-6 lg:p-8"
        >
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </motion.main>
      </div>
    </div>
  );
};

export default DashboardLayout;
