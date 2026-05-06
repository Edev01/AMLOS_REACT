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
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: { id: string; label: string; path: string }[];
}

const SchoolAdminSidebar: React.FC<SidebarProps> = ({ activePage }) => {
  const { user, logout, tenant, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  
  // Mobile sidebar state
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Get tenant ID from URL
  const tenantId = params.tenantId || tenant.campusId || '';
  
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
        label: isCollapsed ? '' : 'Dashboard', 
        icon: <LayoutDashboard size={20} />, 
        path: `${basePath}/dashboard` 
      },
      {
        id: 'students',
        label: isCollapsed ? '' : 'Students',
        icon: <GraduationCap size={20} />,
        children: [
          { id: 'all-students', label: 'All Students', path: `${basePath}/students` },
          { id: 'add-student', label: 'Add Student', path: `${basePath}/students/add` },
          { id: 'attendance', label: 'Attendance', path: `${basePath}/attendance` },
        ],
      },
      {
        id: 'teachers',
        label: isCollapsed ? '' : 'Teachers',
        icon: <Users size={20} />,
        children: [
          { id: 'all-teachers', label: 'All Teachers', path: `${basePath}/teachers` },
          { id: 'add-teacher', label: 'Add Teacher', path: `${basePath}/teachers/add` },
        ],
      },
      {
        id: 'academic',
        label: isCollapsed ? '' : 'Academic',
        icon: <BookOpen size={20} />,
        children: [
          { id: 'classes', label: 'Classes', path: `${basePath}/classes` },
          { id: 'subjects', label: 'Subjects', path: `${basePath}/subjects` },
          { id: 'curriculum', label: 'Curriculum', path: `${basePath}/curriculum` },
        ],
      },
      { 
        id: 'content', 
        label: isCollapsed ? '' : 'Content', 
        icon: <FileText size={20} />,
        path: `${basePath}/content`
      },
      { 
        id: 'quiz', 
        label: isCollapsed ? '' : 'Quiz', 
        icon: <ClipboardList size={20} />,
        path: `${basePath}/quizzes`
      },
      ...(isSuperAdmin ? [{
        id: 'planner' as const,
        label: isCollapsed ? '' : 'Planner',
        icon: <CalendarDays size={20} />,
        children: [
          { id: 'create-planner', label: 'Create Planner', path: `${basePath}/planners/create` },
          { id: 'all-planner', label: 'All Planners', path: `${basePath}/planners` },
        ],
      }] : []),
      { 
        id: 'analytics', 
        label: isCollapsed ? '' : 'Analytics', 
        icon: <BarChart3 size={20} />,
        path: `${basePath}/analytics`
      },
      { 
        id: 'notifications', 
        label: isCollapsed ? '' : 'Notifications', 
        icon: <Bell size={20} />,
        path: `${basePath}/notifications`
      },
      { 
        id: 'settings', 
        label: isCollapsed ? '' : 'Settings', 
        icon: <Settings size={20} />,
        path: `${basePath}/settings`
      },
    ];
  };

  const menuItems = getMenuItems();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const sidebarWidth = isCollapsed ? 'w-20' : 'w-64';

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden h-10 w-10 rounded-xl bg-white shadow-lg border border-slate-200 flex items-center justify-center"
      >
        <Menu size={20} className="text-slate-700" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-900 text-white transition-all duration-300 ease-in-out
          ${sidebarWidth}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 via-transparent to-purple-600/10 pointer-events-none" />
        
        {/* Brand Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex items-center gap-3 px-5 py-5 border-b border-white/10"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30">
            {isSuperAdmin ? <Sparkles size={20} className="text-white" /> : <Building2 size={20} className="text-white" />}
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold leading-tight text-white truncate">EduPortal</h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase truncate">
                {isSuperAdmin ? 'Super Admin' : 'School Admin'}
              </p>
            </div>
          )}
        </motion.div>

        {/* Campus Badge */}
        {!isCollapsed && tenant.campusName && (
          <div className="mx-4 mt-4 mb-2">
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2">
              <p className="text-xs text-blue-300 font-medium truncate">{tenant.campusName}</p>
              <p className="text-[10px] text-slate-500">ID: {tenantId}</p>
            </div>
          </div>
        )}

        {/* Collapse Button (Desktop) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-20 -right-3 h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors hidden lg:flex"
        >
          <ChevronLeft size={14} className={`transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>

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
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className={`${active ? 'text-blue-400' : 'text-slate-400 group-hover:text-blue-400'} transition-colors`}>
                    {item.icon}
                  </span>
                  
                  {!isCollapsed && (
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
                  {hasChildren && expanded && !isCollapsed && (
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

        {/* User Profile */}
        <div className="relative border-t border-white/10 p-4">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
              {user?.username?.[0] || user?.email?.[0] || 'A'}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.username || user?.email}</p>
                <p className="text-xs text-slate-400 truncate">{user?.role}</p>
              </div>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <div className="relative border-t border-white/10 p-3">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? 'Logout' : undefined}
          >
            <LogOut size={18} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Spacer */}
      <div className={`hidden lg:block ${sidebarWidth} flex-shrink-0 transition-all duration-300`} />
    </>
  );
};

export default SchoolAdminSidebar;
