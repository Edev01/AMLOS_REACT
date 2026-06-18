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
        {
          id: 'cms',
          label: 'CMS Management',
          icon: <FileText size={18} />,
          children: [
            { id: 'cms-dashboard', label: 'CMS Dashboard', path: '/admin/cms' },
            { id: 'all-classes', label: 'All Classes', path: '/admin/cms/classes' },
            { id: 'add-class', label: 'Add Class', path: '/admin/cms/classes/add' },
            { id: 'all-subjects', label: 'All Subjects', path: '/admin/cms/subjects' },
            { id: 'add-subject', label: 'Add Subject', path: '/admin/cms/subjects/add' },
            { id: 'all-chapters', label: 'All Chapters', path: '/admin/cms/chapters' },
            { id: 'add-chapter', label: 'Add Chapter', path: '/admin/cms/chapters/add' },
            { id: 'all-slos', label: 'All SLOs', path: '/admin/cms/slos' },
            { id: 'add-slo', label: 'Add SLO', path: '/admin/cms/slos/add' },
            { id: 'upload-slos', label: 'Upload SLOs', path: '/admin/cms/slos/upload' },
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
          icon: <BookOpen size={18} />,
          children: [
            { id: 'all-teachers', label: 'All Teachers', path: '/school/teachers' },
            { id: 'add-teacher', label: 'Add Teacher', path: '/school/teachers/add' },
          ],
        },
        // Strict Sidebar Minimization: Removed Teachers, Quizzes, Content, Academic/Curriculum, Analytics, and Settings per requirements.
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
    const activeParent = menuItems.find(item => isParentActive(item) || isActive(item.path, item.id));
    if (activeParent && activeParent.id) {
      setOpenMenu(activeParent.id);
    }
  }, [location.pathname, activePage]);

  return (
    <aside className={`flex h-full flex-col bg-navy-800 text-white overflow-hidden transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent-blue/5 via-transparent to-transparent pointer-events-none" />
      
      {/* Brand Header with Glass Effect */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative flex items-center gap-3 px-6 py-5 border-b border-white/5"
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
            <h1 className="text-lg font-bold leading-tight text-white truncate">AMLOS</h1>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide truncate">
              {portalLabel}
            </p>
          </div>
        )}
      </motion.div>

      {/* Tenant Context Banner (for Campus Admins) */}
      {!collapsed && isTenantContext && tenant.campusName && (
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
          const isExpanded = openMenu === item.id;
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
                className={`relative flex w-full items-center justify-between rounded-lg py-2.5 text-[13px] font-medium transition-all duration-200 z-10 ${
                  itemActive || parentActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                } ${collapsed ? 'px-0 justify-center' : 'px-4'}`}
                title={collapsed ? item.label : undefined}
              >
                <div className={`flex items-center ${collapsed ? 'justify-center w-full' : 'gap-3'}`}>
                  <span className={`transition-colors duration-200 ${
                    itemActive || parentActive ? 'text-accent-blue' : ''
                  }`}>
                    {item.icon}
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                </div>
                {!collapsed && hasChildren && (
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
                {!collapsed && hasChildren && isExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="overflow-hidden"
                  >
                    <div className="ml-4 space-y-0.5 border-l border-white/10 pl-3 py-0.5">
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
                            {child.label.startsWith('All') || child.label.includes('Dashboard') ? (
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

    </aside>
  );
};

export default Sidebar;
