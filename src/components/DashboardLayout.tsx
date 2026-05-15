import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
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
  Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useIsFetching } from '@tanstack/react-query';
import Sidebar from './Sidebar';
import SchoolAdminSidebar from './SchoolAdminSidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activePage?: string;
}

// Search items for Command+K
const searchItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} />, path: '/dashboard', shortcut: 'D' },
  { id: 'schools', label: 'All Schools', icon: <School size={16} />, path: '/schools', shortcut: 'S' },
  { id: 'add-school', label: 'Add School', icon: <School size={16} />, path: '/schools/add', shortcut: 'A' },
  { id: 'users', label: 'User Management', icon: <Users size={16} />, path: '#', shortcut: 'U' },
  { id: 'planners', label: 'All Planners', icon: <CalendarDays size={16} />, path: '/planners', shortcut: 'P' },
  { id: 'create-planner', label: 'Create Planner', icon: <ClipboardList size={16} />, path: '/planners/create', shortcut: 'C' },
  { id: 'content', label: 'Content Management', icon: <FileText size={16} />, path: '#', shortcut: 'M' },
  { id: 'settings', label: 'Settings', icon: <Settings size={16} />, path: '#', shortcut: ',' },
];

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, activePage }) => {
  const { user, isSuperAdmin } = useAuth();
  const isFetching = useIsFetching();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Determine which sidebar to show based on route
  const isSchoolAdminRoute = location.pathname.startsWith('/campus/');
  const useSchoolAdminSidebar = isSchoolAdminRoute && !isSuperAdmin;
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const commandInputRef = useRef<HTMLInputElement>(null);
  
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

  const filteredItems = searchItems
    .filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(item => {
      const isPlannerItem = item.id === 'planners' || item.id === 'create-planner';
      return !isPlannerItem || isSuperAdmin;
    });

  const handleNavigate = (path: string) => {
    if (path !== '#') {
      window.location.href = path;
    }
    setCommandOpen(false);
  };

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
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" 
            onClick={() => setMobileOpen(false)} 
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

      {/* Sidebar — always visible on lg+, slide-in on mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {useSchoolAdminSidebar ? (
          <SchoolAdminSidebar activePage={activePage} />
        ) : (
          <Sidebar activePage={activePage} />
        )}
      </div>

      {/* Main content area */}
      <div className="lg:ml-[260px]">
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
          {/* Mobile hamburger */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 lg:hidden transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </motion.button>

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

          {/* Right section — notifications + user */}
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            </motion.button>

            {/* User avatar & info */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-slate-800">
                  {isSuperAdmin ? 'Super Admin' : user?.role === 'SCHOOL_ADMIN' ? 'School Admin' : 'Admin'}
                </p>
                <p className="text-[11px] text-slate-400">{user?.email || 'admin@eduadmin.com'}</p>
              </div>
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue to-accent-indigo text-xs font-bold text-white shadow-glow-blue cursor-pointer"
              >
                {initials || 'AK'}
              </motion.div>
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
