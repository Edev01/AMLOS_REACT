import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
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
    academic: false,
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
    const activeParent = menuItems.find(item => isParentActive(item) || isActive(item.path, item.id));
    if (activeParent && activeParent.id) {
      setExpandedMenus(prev => ({ ...prev, [activeParent.id]: true }));
    }
  }, [location.pathname, activePage]);

  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-[260px]';

  return (
    <aside 
      className={`flex h-full flex-col bg-slate-900 text-white transition-all duration-300 ease-in-out ${sidebarWidth}`}
    >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 via-transparent to-purple-600/10 pointer-events-none" />
        
        {/* Brand Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex items-center gap-3 px-5 py-5 border-b border-white/10"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30 flex-shrink-0">
            {isSuperAdmin ? <Sparkles size={20} className="text-white" /> : <Building2 size={20} className="text-white" />}
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold leading-tight text-white truncate">AMLOS</h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase truncate">
                {portalLabel}
              </p>
            </div>
          )}
        </motion.div>

        {/* Campus Badge */}
        {!collapsed && tenant.campusName && (
          <div className="mx-4 mt-4 mb-2">
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2">
              <p className="text-xs text-blue-300 font-medium truncate">{tenant.campusName}</p>
              <p className="text-[10px] text-slate-500">ID: {tenantId}</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav ref={navRef} className="relative flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {/* Menu Items */}
          {menuItems.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const expanded = expandedMenus[item.id];
            const active = isActive(item.path, item.id) || isParentActive(item);

            return (
              <div key={item.id} className="relative">
                <button
                  onClick={() => {
                    if (hasChildren) {
                      toggleMenu(item.id);
                    } else if (item.path) {
                      navigate(item.path);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative z-10
                    ${active 
                      ? 'text-white' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }
                    ${collapsed ? 'justify-center' : ''}
                  `}
                  title={collapsed ? item.label : undefined}
                >
                  <span className={`${active ? 'text-blue-400' : 'text-slate-400 group-hover:text-blue-400'} transition-colors`}>
                    {item.icon}
                  </span>
                  
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {hasChildren && (
                        <span className="text-slate-500">
                          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </span>
                      )}
                    </>
                  )}
                </button>

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
                      <div className="ml-6 mt-1 space-y-1 border-l border-white/10 pl-4">
                        {item.children?.map((child) => (
                          <button
                            key={child.id}
                            onClick={() => navigate(child.path)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200
                              ${isActive(child.path, child.id)
                                ? 'text-blue-400 bg-blue-500/10'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
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
