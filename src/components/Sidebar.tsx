import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { hasCrossTenantAccess } from '../types';
import {
  LogOut,
  LayoutDashboard,
  School,
  Users,
  BookOpen,
  FileText,
  ClipboardList,
  CalendarDays,
  BarChart3,
  Bell,
  Settings,
  ChevronDown,
  ChevronUp,
  Plus,
  List,
  Sparkles,
  Building2,
  Shield,
  GraduationCap,
} from 'lucide-react';

interface SidebarProps {
  activePage?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: { id: string; label: string; path: string }[];
}

const Sidebar: React.FC<SidebarProps> = ({ activePage }) => {
  const { user, logout, tenant, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  
  // Detect if we're in tenant context
  const tenantId = params.tenantId || tenant.campusId;
  const isTenantContext = location.pathname.startsWith('/campus/');
  
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    school: true,
    planner: false,
  });
  const [activeIndicator, setActiveIndicator] = useState({ top: 0, height: 0 });
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const toggleMenu = (key: string) => {
    setExpandedMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path?: string, id?: string) => {
    if (activePage && id) return activePage === id;
    if (path) return location.pathname === path;
    return false;
  };

  const isParentActive = (item: MenuItem) => {
    if (item.children) {
      return item.children.some((child) => location.pathname === child.path || activePage === child.id);
    }
    return false;
  };

  // Update sliding indicator position
  useEffect(() => {
    const updateIndicator = () => {
      let activeItem: HTMLButtonElement | null = null;
      
      itemRefs.current.forEach((ref, key) => {
        const item = menuItems.find(m => m.id === key);
        if (item && (isActive(item.path, item.id) || isParentActive(item))) {
          activeItem = ref;
        }
      });

      if (activeItem && navRef.current) {
        const navRect = navRef.current.getBoundingClientRect();
        const itemRect = (activeItem as HTMLElement).getBoundingClientRect();
        setActiveIndicator({
          top: itemRect.top - navRect.top,
          height: itemRect.height,
        });
      }
    };

    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [location.pathname, activePage, expandedMenus]);

  // Generate tenant-aware menu items based on role and context
  const getMenuItems = (): MenuItem[] => {
    const basePath = isTenantContext && tenantId ? `/campus/${tenantId}` : '/admin';
    
    // SUPER_ADMIN and ADMIN roles get full global access
    if (isSuperAdmin || user?.role === 'ADMIN') {
      return [
        { 
          id: 'dashboard', 
          label: 'Central Dashboard', 
          icon: <LayoutDashboard size={18} />, 
          path: '/admin/central-dashboard' 
        },
        {
          id: 'school',
          label: 'Global School Management',
          icon: <School size={18} />,
          children: [
            { id: 'all-schools', label: 'All Schools', path: '/admin/schools' },
            { id: 'add-school', label: 'Add School', path: '/admin/schools/add' },
          ],
        },
        {
          id: 'planner',
          label: 'Planner Management',
          icon: <CalendarDays size={18} />,
          children: [
            { id: 'create-planner', label: 'Add Planner', path: '/admin/planners/create' },
            { id: 'all-planner', label: 'All Planner', path: '/admin/planners' },
          ],
        },
      ];
    }

    // SCHOOL role gets School Admin specific menu (from Figma design)
    if (user?.role === 'SCHOOL') {
      return [
        { 
          id: 'dashboard', 
          label: 'Dashboard', 
          icon: <LayoutDashboard size={18} />, 
          path: '/school/dashboard' 
        },
        { 
          id: 'students', 
          label: 'Students', 
          icon: <Users size={18} />,
          children: [
            { id: 'all-students', label: 'All Students', path: '/school/students' },
            { id: 'add-student', label: 'Add Student', path: '/school/students/add' },
          ],
        },
        { 
          id: 'teachers', 
          label: 'Teachers', 
          icon: <GraduationCap size={18} />,
          children: [
            { id: 'all-teachers', label: 'All Teachers', path: '/school/teachers' },
            { id: 'add-teacher', label: 'Add Teacher', path: '/school/teachers/add' },
          ],
        },
        { 
          id: 'academic', 
          label: 'Academic', 
          icon: <BookOpen size={18} />,
          children: [
            { id: 'classes', label: 'Classes', path: '/school/classes' },
            { id: 'subjects', label: 'Subjects', path: '/school/subjects' },
            { id: 'curriculum', label: 'Curriculum', path: '/school/curriculum' },
          ],
        },
        { 
          id: 'content', 
          label: 'Content', 
          icon: <FileText size={18} />,
          children: [
            { id: 'lessons', label: 'Lessons', path: '/school/lessons' },
            { id: 'resources', label: 'Resources', path: '/school/resources' },
          ],
        },
        { 
          id: 'quiz', 
          label: 'Quiz', 
          icon: <ClipboardList size={18} />,
          children: [
            { id: 'all-quizzes', label: 'All Quizzes', path: '/school/quizzes' },
            { id: 'create-quiz', label: 'Create Quiz', path: '/school/quizzes/create' },
          ],
        },
        { 
          id: 'analytics', 
          label: 'Analytics', 
          icon: <BarChart3 size={18} />,
          path: '/school/analytics'
        },
        { 
          id: 'settings', 
          label: 'Settings', 
          icon: <Settings size={18} />,
          path: '/school/settings'
        },
      ];
    }
    
    // CAMPUS_ADMIN gets restricted tenant-only access
    return [
      { 
        id: 'dashboard', 
        label: 'Campus Dashboard', 
        icon: <LayoutDashboard size={18} />, 
        path: `${basePath}/dashboard` 
      },
      { 
        id: 'school', 
        label: 'My Campus', 
        icon: <Building2 size={18} />,
        path: `${basePath}/schools`
      },
      { 
        id: 'planner',
        label: 'Study Planners',
        icon: <CalendarDays size={18} />,
        children: [
          { id: 'create-planner', label: 'Create Planner', path: `${basePath}/planners/create` },
          { id: 'all-planner', label: 'All Planners', path: `${basePath}/planners` },
        ],
      },
      { id: 'users', label: 'Campus Staff', icon: <Users size={18} /> },
      { id: 'analytics', label: 'Campus Reports', icon: <BarChart3 size={18} /> },
      { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
    ];
  };

  const menuItems = getMenuItems();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-navy-800 text-white overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent-blue/5 via-transparent to-transparent pointer-events-none" />
      
      {/* Brand Header with Glass Effect */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative flex items-center gap-3 px-6 py-5 border-b border-white/5"
      >
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-glow-blue ${
          isSuperAdmin 
            ? 'bg-gradient-to-br from-purple-500 to-purple-700' 
            : 'bg-gradient-to-br from-accent-blue to-accent-indigo'
        }`}>
          {isSuperAdmin ? <Shield size={20} className="text-white" /> : <Sparkles size={20} className="text-white" />}
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight text-white">AMLOS</h1>
          <p className="text-[11px] text-slate-400 font-medium tracking-wide">
            {isSuperAdmin ? 'SUPER ADMIN' : isTenantContext ? tenant.campusName?.toUpperCase() || 'CAMPUS' : 'ADMIN PORTAL'}
          </p>
        </div>
      </motion.div>

      {/* Tenant Context Banner (for Campus Admins) */}
      {isTenantContext && tenant.campusName && (
        <div className="mx-4 mt-4 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2">
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-blue-400" />
            <span className="text-xs text-blue-300 font-medium truncate">
              {tenant.campusName}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Tenant ID: {tenantId}</p>
        </div>
      )}

      {/* Navigation with Sliding Highlight */}
      <nav ref={navRef} className="relative flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {/* Sliding Active Indicator */}
        <motion.div
          className="absolute left-3 right-3 rounded-lg bg-accent-blue/20 border border-accent-blue/20"
          initial={false}
          animate={{
            top: activeIndicator.top,
            height: activeIndicator.height,
            opacity: activeIndicator.height > 0 ? 1 : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
            mass: 0.8,
          }}
          style={{ pointerEvents: 'none' }}
        />
        
        {/* Active Pill Indicator */}
        <motion.div
          className="absolute left-0 w-1 rounded-r-full bg-gradient-to-b from-accent-blue to-accent-indigo"
          initial={false}
          animate={{
            top: activeIndicator.top + 8,
            height: activeIndicator.height - 16,
            opacity: activeIndicator.height > 0 ? 1 : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
            mass: 0.8,
          }}
          style={{ pointerEvents: 'none' }}
        />

        {menuItems.map((item, index) => {
          const hasChildren = !!item.children;
          const isExpanded = expandedMenus[item.id] ?? false;
          const parentActive = isParentActive(item);
          const itemActive = isActive(item.path, item.id);

          return (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                duration: 0.3, 
                delay: index * 0.05,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
            >
              <button
                ref={(el) => {
                  if (el) itemRefs.current.set(item.id, el);
                }}
                type="button"
                onClick={() => {
                  if (hasChildren) {
                    toggleMenu(item.id);
                  } else if (item.path) {
                    navigate(item.path);
                  }
                }}
                className={`relative flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-[13px] font-medium transition-all duration-200 z-10 ${
                  itemActive || parentActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`transition-colors duration-200 ${
                    itemActive || parentActive ? 'text-accent-blue' : ''
                  }`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {hasChildren && (
                  <motion.span 
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-slate-500"
                  >
                    <ChevronDown size={14} />
                  </motion.span>
                )}
              </button>

              {/* Sub-items with Animation */}
              <AnimatePresence>
                {hasChildren && isExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1 ml-4 space-y-1 border-l border-white/10 pl-3 py-1">
                      {item.children!.map((child, childIndex) => {
                        const childActive = isActive(child.path, child.id);
                        return (
                          <motion.button
                            key={child.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: childIndex * 0.03 }}
                            type="button"
                            onClick={() => navigate(child.path)}
                            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-[12.5px] transition-all duration-200 ${
                              childActive
                                ? 'text-accent-blue font-semibold bg-accent-blue/10'
                                : 'text-slate-500 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {child.label === 'All Schools' || child.label === 'All Planner' ? (
                              <List size={14} />
                            ) : (
                              <Plus size={14} />
                            )}
                            <span>{child.label}</span>
                            {childActive && (
                              <motion.div
                                layoutId="activeChildIndicator"
                                className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-blue"
                              />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </nav>

      {/* User Info Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mx-3 mb-3 p-3 rounded-xl bg-white/5 border border-white/10"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent-blue to-accent-indigo text-xs font-bold text-white">
            {(user?.username || user?.email || 'AK').split(/[@.\s]/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.username || 'Super Admin'}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email || 'admin@eduadmin.com'}</p>
          </div>
        </div>
      </motion.div>

      {/* Logout */}
      <div className="border-t border-white/10 px-3 py-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-[13px] font-medium text-slate-400 transition-all duration-200 hover:bg-rose-500/10 hover:text-rose-400"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </motion.button>
      </div>
    </aside>
  );
};

export default Sidebar;
