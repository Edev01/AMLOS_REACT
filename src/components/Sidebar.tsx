import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';
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
  Briefcase,
  DollarSign,
  UserCog,
  GraduationCap as StudentIcon,
  ClipboardCheck,
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

const Sidebar: React.FC<SidebarProps> = ({ activePage, collapsed = false }) => {
  const { user, logout, tenant, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  
  // Detect if we're in tenant context
  const tenantId = params.tenantId || tenant.campusId;
  const isTenantContext = location.pathname.startsWith('/campus/');
  const role = user?.role;
  const rawSchoolIdForDisplay = tenant.schoolId || user?.school_id || '';
  const schoolIdDisplayFallback =
    rawSchoolIdForDisplay && /[A-Za-z]/.test(String(rawSchoolIdForDisplay))
      ? String(rawSchoolIdForDisplay)
      : '';
  const schoolPortalName =
    role === 'SCHOOL'
      ? tenant.schoolName ||
        user?.school_name ||
        (user as any)?.school?.school_name ||
        (user as any)?.school?.name ||
        localStorage.getItem('school_name') ||
        schoolIdDisplayFallback
      : '';
  const portalLabel = isSuperAdmin
    ? 'SUPER ADMIN'
    : role === 'SCHOOL'
      ? schoolPortalName?.toUpperCase() || 'SCHOOL PORTAL'
      : role === 'TEACHER'
        ? 'TEACHER PORTAL'
        : isTenantContext
          ? tenant.campusName?.toUpperCase() || 'CAMPUS'
          : 'ADMIN PORTAL';
  
  // Ensure this component re-renders when the user role changes
  useEffect(() => {
    // Logic to trigger re-render if needed
  }, [user?.role]);

  // Single-open accordion: only one menu expanded at a time
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [activeIndicator, setActiveIndicator] = useState({ top: 0, height: 0 });
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const toggleMenu = (key: string) => {
    setOpenMenu(prev => prev === key ? null : key);
  };

  const handleLogout = () => {
    toast.success('Logged out successfully. See you soon!', { duration: 3000 });
    setTimeout(() => {
      logout();
      navigate('/login');
    }, 1500);
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
        if (item && (isActive(item.path, item.id) || isParentActive(item) || openMenu === key)) {
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
  }, [location.pathname, activePage, openMenu]);

  // Close collapsed menu when clicking outside
  useEffect(() => {
    if (!collapsed) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [collapsed]);

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
          id: 'cms',
          label: 'CMS Management',
          icon: <FileText size={18} />,
          children: [
            { id: 'cms-dashboard', label: 'CMS Dashboard', path: '/admin/cms' },
            { id: 'all-classes', label: 'All Classes', path: '/admin/cms/classes' },
            { id: 'all-subjects', label: 'All Subjects', path: '/admin/cms/subjects' },
            { id: 'all-chapters', label: 'All Chapters', path: '/admin/cms/chapters' },
            { id: 'all-slos', label: 'All SLOs', path: '/admin/cms/slos' },
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
        {
          id: 'assessment-management',
          label: 'Assessment Management',
          icon: <ClipboardList size={18} />,
          children: [
            { id: 'create-assessment-template', label: 'Create Template', path: '/admin/assessments/templates/create' },
            { id: 'all-assessment-templates', label: 'All Templates', path: '/admin/assessments/templates' },
          ],
        },
        {
          id: 'paper-checkers',
          label: 'Paper Checkers',
          icon: <ClipboardCheck size={18} />,
          path: '/admin/paper-checkers',
        },
        {
          id: 'role-management',
          label: 'Role Management',
          icon: <UserCog size={18} />,
          path: '/admin/roles',
        },
        {
          id: 'hr-management',
          label: 'HR Management',
          icon: <Briefcase size={18} />,
          path: '/admin/hr-management',
        },
        {
          id: 'finance-management',
          label: 'Finance Management',
          icon: <DollarSign size={18} />,
          path: '/admin/finance-management',
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
          icon: <BookOpen size={18} />,
          children: [
            { id: 'all-teachers', label: 'All Teachers', path: '/school/teachers' },
            { id: 'add-teacher', label: 'Add Teacher', path: '/school/teachers/add' },
          ],
        },
        {
          id: 'submissions',
          label: 'Submissions',
          icon: <ClipboardList size={18} />,
          path: '/school/submissions',
        },
        // Strict Sidebar Minimization: Removed Teachers, Quizzes, Content, Academic/Curriculum, Analytics, and Settings per requirements.
      ];
    }

    // TEACHER role gets Students + Teachers menu
    if (user?.role === 'TEACHER') {
      return [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard size={18} />,
          path: '/teacher-dashboard',
        },
        {
          id: 'students',
          label: 'Students',
          icon: <Users size={18} />,
          children: [
            { id: 'all-students', label: 'All Students', path: '/school/students' },
          ],
        },
        {
          id: 'teachers',
          label: 'Teachers',
          icon: <BookOpen size={18} />,
          children: [
            { id: 'all-teachers', label: 'All Teachers', path: '/school/teachers' },
          ],
        },
        {
          id: 'submissions',
          label: 'Submissions',
          icon: <ClipboardList size={18} />,
          path: '/teacher/submissions',
        },
      ];
    }
    
    // CAMPUS_ADMIN gets restricted tenant-only access
    return [
      { 
        id: 'students', 
        label: 'Students', 
        icon: <Users size={18} />,
        children: [
          { id: 'all-students', label: 'All Students', path: '/school/students' },
          { id: 'add-student', label: 'Create Student', path: '/school/students/add' },
        ],
      },
      { 
        id: 'teachers', 
        label: 'Teachers', 
        icon: <BookOpen size={18} />,
        children: [
          { id: 'all-teachers', label: 'All Teachers', path: '/school/teachers' },
          { id: 'add-teacher', label: 'Add Teacher', path: '/school/teachers/add' },
        ],
      },
    ];
  };

  const menuItems = getMenuItems();

  useEffect(() => {
    if (collapsed) return;
    const activeParent = menuItems.find(item => isParentActive(item) || isActive(item.path, item.id));
    if (activeParent && activeParent.id) {
      setOpenMenu(activeParent.id);
    }
  }, [location.pathname, activePage, collapsed]);

  // Ensure dropdown closes when navigating to a new page
  useEffect(() => {
    if (collapsed) {
      setOpenMenu(null);
    }
  }, [location.pathname, collapsed]);

  const { isDark } = useTheme();

  return (
    <aside className={`relative flex h-full flex-col rounded-[24px] shadow-2xl transition-all duration-300 ${'bg-white text-slate-800'} w-full`}>
      {/* Subtle gradient overlay */}
      {true && <div className="absolute inset-0 bg-gradient-to-b from-accent-blue/5 via-transparent to-transparent pointer-events-none rounded-[24px]" />}
      
      {/* Brand Header with Glass Effect */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`relative flex items-center gap-3 py-6 border-b rounded-t-[24px] ${'border-slate-100'} ${collapsed ? 'justify-center px-2' : 'px-6'}`}
      >
        <div className={`flex items-center justify-center rounded-xl shadow-glow-blue flex-shrink-0 ${collapsed ? 'h-8 w-8' : 'h-10 w-10'} ${
          isSuperAdmin 
            ? 'bg-gradient-to-br from-purple-500 to-purple-700' 
            : 'bg-gradient-to-br from-accent-blue to-accent-indigo'
        }`}>
          {isSuperAdmin ? <Shield size={20} className="text-white" /> : <Sparkles size={20} className="text-white" />}
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className={`text-lg font-bold leading-tight truncate ${'text-slate-900'}`}>AMLOS</h1>
            <p className={`text-[11px] font-medium tracking-wide truncate ${'text-slate-500'}`}>
              {portalLabel}
            </p>
          </div>
        )}
      </motion.div>

      {/* Tenant Context Banner (for Campus Admins) */}
      {!collapsed && isTenantContext && tenant.campusName && (
        <div className={`mx-4 mt-4 rounded-lg border px-3 py-2 ${'bg-blue-50 border-blue-100'}`}>
          <div className="flex items-center gap-2">
            <Building2 size={14} className={'text-blue-600'} />
            <span className={`text-xs font-medium truncate ${'text-blue-700'}`}>
              {tenant.campusName}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Tenant ID: {tenantId}</p>
        </div>
      )}

      {/* Navigation with Sliding Highlight */}
      <nav ref={navRef} className={`relative flex-1 px-3 py-4 space-y-1 custom-scrollbar ${collapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden'}`}>
        {/* Sliding Active Indicator */}
        <motion.div
          className="absolute left-3 right-3 rounded-lg bg-accent-blue/10 border border-accent-blue/20"
          initial={false}
          animate={{
            top: activeIndicator.top,
            height: activeIndicator.height,
            opacity: activeIndicator.height > 0 ? 1 : 0,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.8 }}
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
          transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.8 }}
          style={{ pointerEvents: 'none' }}
        />

        {menuItems.map((item, index) => {
          const hasChildren = !!item.children;
          const isExpanded = openMenu === item.id;
          const parentActive = isParentActive(item);
          const itemActive = isActive(item.path, item.id);

          return (
            <motion.div 
              key={item.id}
              className="relative group"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <button
                ref={(el) => { if (el) itemRefs.current.set(item.id, el); }}
                type="button"
                onClick={() => {
                  if (hasChildren) {
                    toggleMenu(item.id);
                  } else if (item.path) {
                    setOpenMenu(null);
                    navigate(item.path);
                  }
                }}
                className={`relative flex w-full items-center justify-between rounded-lg py-2.5 text-[13px] font-medium transition-all duration-200 z-10 ${
                  itemActive || parentActive
                    ? ('text-accent-blue font-semibold')
                    : ('text-slate-600 hover:text-slate-900 hover:bg-slate-100')
                } ${collapsed ? 'px-0 justify-center' : 'px-4'}`}
              >
                <div className={`flex items-center ${collapsed ? 'justify-center w-full' : 'gap-3'}`}>
                  <span className={`transition-colors duration-200 ${itemActive || parentActive ? 'text-accent-blue' : ''}`}>
                    {item.icon}
                  </span>
                  {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
                </div>
                {!collapsed && hasChildren && (
                  <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} className={'text-slate-400'}>
                    <ChevronDown size={14} />
                  </motion.span>
                )}
              </button>

              {/* Collapsed Hover Tooltip */}
              {collapsed && !isExpanded && (
                <div className={`absolute left-[54px] top-1/2 -translate-y-1/2 hidden whitespace-nowrap rounded-[8px] px-3 py-2 text-[13px] font-bold shadow-lg border group-hover:block z-[100] pointer-events-none ${'bg-white text-slate-800 border-slate-200'}`}>
                  {item.label}
                </div>
              )}

              {/* Collapsed Click Popover for children */}
              {collapsed && hasChildren && isExpanded && (
                <div className={`absolute left-[54px] top-0 min-w-[180px] rounded-[16px] shadow-[0_8px_30px_rgb(0,0,0,0.4)] border z-[100] overflow-hidden ${'bg-white border-slate-200'}`}>
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
                            setOpenMenu(null);
                            navigate(child.path);
                          }}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors border border-transparent ${
                            childActive
                              ? ('text-accent-blue font-semibold bg-accent-blue/10 border-accent-blue/20')
                              : ('text-slate-600 hover:text-slate-900 hover:bg-slate-100')
                          }`}
                        >
                          <span>{child.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-items with Animation */}
              <AnimatePresence>
                {!collapsed && hasChildren && isExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="overflow-hidden"
                  >
                    <div className={`ml-4 space-y-0.5 border-l pl-3 py-1 mt-1 ${'border-slate-200'}`}>
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
                            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-[12.5px] transition-all duration-200 border ${
                              childActive
                                ? ('text-accent-blue font-semibold bg-accent-blue/10 border-accent-blue/20')
                                : ('text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent')
                            }`}
                          >
                            <span>{child.label}</span>
                            {childActive && (
                              <motion.div layoutId="activeChildIndicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-blue" />
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
      
      {/* Bottom Actions if any */}
      <div className={`mt-auto border-t p-4 rounded-b-[24px] ${'border-slate-100'}`}>
        <button
          onClick={handleLogout}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all ${
            'text-slate-600 hover:bg-red-50 hover:text-red-600'
          } ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
