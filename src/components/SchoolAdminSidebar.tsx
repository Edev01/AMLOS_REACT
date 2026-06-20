import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LogOut,
  LayoutDashboard,
  GraduationCap,
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
  Sparkles,
  Building2,
  ChevronLeft,
  Menu,
} from 'lucide-react';

interface SidebarProps {
  activePage?: string;
  collapsed?: boolean;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: { id: string; label: string; path: string }[];
}

const SchoolAdminSidebar: React.FC<SidebarProps> = ({ activePage, collapsed = false }) => {
  const { user, logout, tenant, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  
  // Get tenant ID from URL
  const tenantId = params.tenantId || tenant.campusId || '';
  const role = user?.role;
  const portalLabel = isSuperAdmin
    ? 'SUPER ADMIN'
    : role === 'SCHOOL'
      ? 'SCHOOL PORTAL'
      : role === 'TEACHER'
        ? 'TEACHER PORTAL'
        : 'ADMIN PORTAL';
  
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    students: false,
    teachers: false,
    planner: false,
  });
  
  const navRef = useRef<HTMLDivElement>(null);

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

  // Tenant-specific menu items
  const getMenuItems = (): MenuItem[] => {
    const basePath = `/campus/${tenantId}`;
    
    return [
      { 
        id: 'dashboard', 
        label: collapsed ? '' : 'Dashboard', 
        icon: <LayoutDashboard size={20} />, 
        path: `${basePath}/dashboard` 
      },
      {
        id: 'students',
        label: collapsed ? '' : 'Students',
        icon: <GraduationCap size={20} />,
        children: [
          { id: 'all-students', label: 'All Students', path: `${basePath}/students` },
          { id: 'add-student', label: 'Add Student', path: `${basePath}/students/add` },
        ],
      },
      {
        id: 'teachers',
        label: collapsed ? '' : 'Teachers',
        icon: <BookOpen size={20} />,
        children: [
          { id: 'all-teachers', label: 'All Teachers', path: `${basePath}/teachers` },
          { id: 'add-teacher', label: 'Add Teacher', path: `${basePath}/teachers/add` },
        ],
      },
      // Strict Sidebar Minimization: Removed Quizzes, Content, Academic/Curriculum, Analytics, and Settings per requirements.
      ...(isSuperAdmin ? [{
        id: 'planner' as const,
        label: collapsed ? '' : 'Planner',
        icon: <CalendarDays size={20} />,
        children: [
          { id: 'create-planner', label: 'Create Planner', path: `${basePath}/planners/create` },
          { id: 'all-planner', label: 'All Planners', path: `${basePath}/planners` },
        ],
      }] : []),
    ];
  };

  const menuItems = getMenuItems();

  useEffect(() => {
    if (collapsed) return;
    const activeParent = menuItems.find(item => isParentActive(item) || isActive(item.path, item.id));
    if (activeParent && activeParent.id) {
      setExpandedMenus(prev => ({ ...prev, [activeParent.id]: true }));
    }
  }, [location.pathname, activePage, collapsed]);

  // Close collapsed menu when clicking outside
  useEffect(() => {
    if (!collapsed) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setExpandedMenus({
          students: false,
          teachers: false,
          planner: false,
        });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [collapsed]);

  const { isDark } = useTheme();

  return (
    <aside 
      className={`relative flex h-full flex-col rounded-[24px] shadow-2xl transition-all duration-300 ease-in-out ${isDark ? 'bg-white text-slate-800' : 'bg-slate-900 text-white'} w-full`}
    >
        {/* Gradient Overlay */}
        {!isDark && <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 via-transparent to-purple-600/10 pointer-events-none rounded-[24px]" />}
        
        {/* Brand Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative flex items-center gap-3 px-5 py-6 border-b rounded-t-[24px] ${isDark ? 'border-slate-100' : 'border-white/10'}`}
        >
          <div className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30 flex-shrink-0 ${collapsed ? 'h-8 w-8' : 'h-10 w-10'}`}>
            {isSuperAdmin ? <Sparkles size={20} className="text-white" /> : <Building2 size={20} className="text-white" />}
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className={`text-lg font-bold leading-tight truncate ${isDark ? 'text-slate-900' : 'text-white'}`}>AMLOS</h1>
              <p className={`text-[10px] font-medium tracking-wide uppercase truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {portalLabel}
              </p>
            </div>
          )}
        </motion.div>

        {/* Campus Badge */}
        {!collapsed && tenant.campusName && (
          <div className="mx-4 mt-4 mb-2">
            <div className={`rounded-lg border px-3 py-2 ${isDark ? 'bg-blue-50 border-blue-100' : 'bg-blue-500/10 border-blue-500/20'}`}>
              <p className={`text-xs font-medium truncate ${isDark ? 'text-blue-700' : 'text-blue-300'}`}>{tenant.campusName}</p>
              <p className="text-[10px] text-slate-500">ID: {tenantId}</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav ref={navRef} className={`relative flex-1 px-3 py-4 space-y-1 custom-scrollbar ${collapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden'}`}>
          {/* Menu Items */}
          {menuItems.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const expanded = expandedMenus[item.id];
            const active = isActive(item.path, item.id) || isParentActive(item);

            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => {
                    if (hasChildren) {
                      toggleMenu(item.id);
                    } else if (item.path) {
                      navigate(item.path);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative z-10
                    ${active 
                      ? (isDark ? 'text-accent-blue font-semibold bg-accent-blue/10 border border-accent-blue/20' : 'text-white bg-blue-500/10 border border-blue-500/20')
                      : (isDark ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent')
                    }
                    ${collapsed ? 'justify-center px-0' : ''}
                  `}
                >
                  <div className={`flex items-center ${collapsed ? 'justify-center w-full' : 'gap-3'}`}>
                    <span className={`${active ? (isDark ? 'text-blue-600' : 'text-blue-400') : (isDark ? 'text-slate-500 group-hover:text-blue-600' : 'text-slate-400 group-hover:text-blue-400')} transition-colors`}>
                      {item.icon}
                    </span>
                    {!collapsed && <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>}
                  </div>
                  
                  {!collapsed && hasChildren && (
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                      {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  )}
                </button>

                {/* Collapsed Hover Tooltip */}
                {collapsed && !expanded && (
                  <div className={`absolute left-[54px] top-1/2 -translate-y-1/2 hidden whitespace-nowrap rounded-[8px] px-3 py-2 text-[13px] font-bold shadow-lg border group-hover:block z-[100] pointer-events-none ${isDark ? 'bg-white text-slate-800 border-slate-200' : 'bg-[#1e293b] text-white border-white/10'}`}>
                    {item.label}
                  </div>
                )}

                {/* Collapsed Click Popover for children */}
                {collapsed && hasChildren && expanded && (
                  <div className={`absolute left-[54px] top-0 min-w-[180px] rounded-[16px] shadow-[0_8px_30px_rgb(0,0,0,0.4)] border z-[100] overflow-hidden ${isDark ? 'bg-white border-slate-200' : 'bg-[#1e293b] border-white/10'}`}>
                    <div className="p-2">
                      <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        {item.label}
                      </div>
                      {item.children!.map((child) => {
                        const childActive = isActive(child.path, child.id);
                        return (
                          <button
                            key={child.id}
                            onClick={() => {
                              toggleMenu(item.id);
                              navigate(child.path);
                            }}
                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors border border-transparent ${
                              childActive
                                ? (isDark ? 'text-accent-blue font-semibold bg-accent-blue/10 border-accent-blue/20' : 'text-blue-400 bg-blue-400/10')
                                : (isDark ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' : 'text-slate-300 hover:text-white hover:bg-white/5')
                            }`}
                          >
                            <span>{child.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Submenu */}
                <AnimatePresence>
                  {hasChildren && expanded && !collapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className={`ml-6 mt-1 space-y-1 border-l pl-4 py-1 ${isDark ? 'border-slate-200' : 'border-white/10'}`}>
                        {item.children?.map((child) => (
                          <button
                            key={child.id}
                            onClick={() => navigate(child.path)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-[12.5px] transition-all duration-200
                              ${isActive(child.path, child.id)
                                ? (isDark ? 'text-accent-blue bg-accent-blue/10 border border-accent-blue/20 font-semibold' : 'text-blue-400 bg-blue-500/10 font-semibold')
                                : (isDark ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-50' : 'text-slate-400 hover:text-white hover:bg-white/5')
                              }
                            `}
                          >
                            {child.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>
    </aside>
  );
};

export default SchoolAdminSidebar;
