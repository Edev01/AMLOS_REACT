import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/Button';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { studyPlanService } from '../api/services/studyPlanService';
import { getGrades } from '../api/services/curriculumService';
import { Plus, Search, Eye, Edit, Copy, Trash2, Calendar, BookOpen, GraduationCap, ChevronLeft, ChevronRight, Clock, Layers, X, AlertTriangle, Loader2, Star, History, CheckCircle2, Info } from 'lucide-react';
import toast from 'react-hot-toast';

// Planner Type Definition
interface Planner {
  id: number;
  name: string;
  grade?: string;
  duration: string;
  subjects: string[];
  topics: number;
  status: 'active' | 'draft' | 'completed';
  createdDate: string;
  examType: string;
  startDate?: string;
  endDate?: string;
  dailyLimit?: string;
  studyTimeDaily?: number;
  mode?: string;
  sloCount?: number;
  selectedSubjects?: number[];
  selectedChapters?: number[];
}

// Status Badge Component with Glow
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config = {
    active: {
      label: 'Active',
      class: 'bg-emerald-500 text-white',
      glow: 'shadow-[0_0_12px_rgba(16,185,129,0.4)]',
    },
    draft: {
      label: 'Draft',
      class: 'bg-amber-500 text-white',
      glow: 'shadow-[0_0_12px_rgba(245,158,11,0.4)]',
    },
    completed: {
      label: 'Completed',
      class: 'bg-slate-600 text-white',
      glow: '',
    },
  };

  const cfg = config[status as keyof typeof config] || config.active;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${cfg.class} ${cfg.glow}`}>
      {cfg.label}
    </span>
  );
};

// Topics Badge Component
const TopicsBadge: React.FC<{ count: number }> = ({ count }) => (
  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-accent-blue text-white text-sm font-bold shadow-md">
    {count}
  </span>
);

/* ─── Edit Planner Modal ─────────────────────────────────────── */
interface EditPlannerModalProps {
  planner: Planner;
  onClose: () => void;
  onSave: (id: number, data: Record<string, any>) => void;
  isSaving: boolean;
}
const EditPlannerModal: React.FC<EditPlannerModalProps> = ({ planner, onClose, onSave, isSaving }) => {
  const { data: gradesData } = useQuery({
    queryKey: ['grades'],
    queryFn: getGrades,
    staleTime: 300000,
  });

  // Use rawObject (actual API data) for form initialization, not the UI-mapped planner
  const raw = (planner as any).rawObject || {};
  const [form, setForm] = useState({
    title: raw.title || raw.plan_name || planner.name || '',
    plan_type: raw.plan_type || planner.examType || '',
    grade: raw.grade || planner.grade || '',
    mode: raw.mode || planner.mode || 'PARALLEL',
    start_date: raw.start_date || (planner.startDate !== 'N/A' ? planner.startDate : '') || '',
    end_date: raw.end_date || (planner.endDate !== 'N/A' ? planner.endDate : '') || '',
    study_time_daily: raw.study_time_daily || planner.studyTimeDaily || '',
  });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => {
      if (['study_time_daily'].includes(name)) {
        return { ...prev, [name]: value === '' ? '' : Number(value) };
      }
      return { ...prev, [name]: value };
    });
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const planId = planner.id || (planner as any)._id || (planner as any).plan_id;
    if (!planId) {
      console.error("Error: planId is missing before sending request!");
      return;
    }
    // Backend expects the exact same keys as POST endpoint.
    // GET returns "scheduled_slos" (objects) but PATCH expects "slo_ids" (numbers).
    const raw = (planner as any).rawObject || {};

    // Extract slo_ids from raw data (GET gives scheduled_slos, we need slo_ids)
    let sloIds: number[] = [];
    if (Array.isArray(raw.slo_ids) && raw.slo_ids.length > 0) {
      sloIds = raw.slo_ids;
    } else if (Array.isArray(raw.scheduled_slos) && raw.scheduled_slos.length > 0) {
      sloIds = raw.scheduled_slos
        .map((s: any) => Number(s.slo || s.slo_id || s.id))
        .filter((n: number) => !isNaN(n) && n > 0);
    }

    // Build payload with ONLY the keys backend expects (POST/PATCH format)
    const cleanPayload: Record<string, any> = {
      title: form.title,
      plan_type: form.plan_type,
      grade: form.grade,
      mode: form.mode,
      start_date: form.start_date,
      end_date: form.end_date,
      study_time_daily: !form.study_time_daily || Number(form.study_time_daily) === 0 ? null : Number(form.study_time_daily),
      skip_weekends: raw.skip_weekends ?? false,
      slo_ids: sloIds,
    };

    console.log("Sending Payload:", cleanPayload);
    onSave(planId, cleanPayload);
  };
  const fields = [
    { name: 'title', label: 'Title', type: 'text' },
    { name: 'plan_type', label: 'Plan Type', type: 'text' },
    { name: 'grade', label: 'Grade', type: 'select', options: gradesData ? gradesData.map((g: any) => g.name) : [planner.grade || ''] },
    { name: 'mode', label: 'Mode', type: 'select', options: ['PARALLEL', 'CUSTOM'] },
    { name: 'start_date', label: 'Start Date', type: 'date' },
    { name: 'end_date', label: 'End Date', type: 'date' },
    { name: 'study_time_daily', label: 'Daily Study Time (min)', type: 'number' },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl">
          <div className="flex items-center gap-3"><Edit size={18} className="text-white" /><h2 className="text-lg font-bold text-white">Edit Planner</h2></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 text-white transition"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {fields.map(f => (
              <div key={f.name} className={`flex flex-col w-full ${f.name === 'title' ? 'md:col-span-2' : ''}`}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                {f.type === 'select' ? (
                  <select
                    name={f.name}
                    value={(form as any)[f.name]}
                    onChange={handleChange}
                    className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                  >
                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    name={f.name}
                    type={f.type}
                    value={(form as any)[f.name]}
                    onChange={handleChange}
                    className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-5 py-2 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2">
              {isSaving && <Loader2 size={14} className="animate-spin" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

/* ─── Delete Confirmation Modal ──────────────────────────────── */
interface DeletePlannerModalProps {
  planner: Planner;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}
const DeletePlannerModal: React.FC<DeletePlannerModalProps> = ({ planner, onClose, onConfirm, isDeleting }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-4"><AlertTriangle size={28} className="text-red-500" /></div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Planner</h3>
        <p className="text-sm text-gray-500 mb-1">Are you sure you want to delete</p>
        <p className="text-sm font-bold text-gray-800 mb-4">"{planner.name}"?</p>
        <p className="text-xs text-red-500 mb-6">This action cannot be undone.</p>
        <div className="flex items-center gap-3 w-full">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={onConfirm} disabled={isDeleting} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {isDeleting && <Loader2 size={14} className="animate-spin" />}
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </motion.div>
  </motion.div>
);

const AllPlanners: React.FC = () => {
  const navigate = useNavigate();
  const ViewPlannerDrawer: React.FC<{ planner: Planner, onClose: () => void }> = ({ planner, onClose }) => {
    const name = planner.name || 'Untitled Planner';
    const grade = planner.grade || 'N/A';
    const examType = planner.examType || 'N/A';
    const duration = planner.duration || 'N/A';
    const mode = planner.mode || 'PARALLEL';
    const studyTimeDaily = planner.studyTimeDaily || 0;
    const sloCount = planner.sloCount || 0;
    const subjects = planner.subjects || [];

    return (
      <>
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]" onClick={onClose} />
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[70] overflow-y-auto"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{name}</h2>
              <p className="text-sm text-gray-500">Planner Details</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Info size={18} className="text-blue-600" />
                General Information
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Grade</p>
                  <p className="text-sm font-semibold text-gray-900">{grade}</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Exam Type</p>
                  <p className="text-sm font-semibold text-gray-900">{examType}</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Duration</p>
                  <p className="text-sm font-semibold text-gray-900">{duration}</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Study Time</p>
                  <p className="text-sm font-semibold text-gray-900">{studyTimeDaily} min/day</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Study Mode</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {mode === 'PARALLEL' ? 'Parallel' :
                      mode === 'SEQUENTIAL' ? 'Sequential' :
                        'Custom'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Total SLOs</p>
                  <p className="text-sm font-semibold text-gray-900">{sloCount} Objectives</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-600" />
                Included Subjects
              </h3>

              {subjects.length > 0 ? (
                <ul className="space-y-2">
                  {subjects.map((sub: string, i: number) => (
                    <li key={i} className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 text-indigo-900 font-medium text-sm">
                      <div className="w-6 h-6 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </div>
                      {typeof sub === 'object' ? (sub as any).title || (sub as any).name || JSON.stringify(sub) : String(sub)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-xl">No subjects explicitly listed</p>
              )}
            </div>
          </div>
        </motion.div>
      </>
    );
  };

  const queryClient = useQueryClient();
  const { user, tenant, isSuperAdmin } = useAuth();
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingPlanner, setEditingPlanner] = useState<Planner | null>(null);
  const [deletingPlanner, setDeletingPlanner] = useState<Planner | null>(null);
  const [viewingPlanner, setViewingPlanner] = useState<Planner | null>(null);
  const itemsPerPage = 6;

  const { data: plannersData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['planners'],
    queryFn: async () => {
      const d = await studyPlanService.listPlans();

      let rawList: any[] = [];
      if (Array.isArray(d)) {
        rawList = d;
      } else if (d?.plans && Array.isArray(d.plans)) {
        rawList = d.plans;
      } else if (d?.data?.plans && Array.isArray(d.data.plans)) {
        rawList = d.data.plans;
      } else if (d?.results && Array.isArray(d.results)) {
        rawList = d.results;
      } else if (d?.data && Array.isArray(d.data)) {
        rawList = d.data;
      }

      return rawList.map((p: any) => ({
        id: p.id || p._id || p.plan_id || p.study_plan_id,
        name: p.title || p.plan_name || p.planner_name || p.name || 'N/A',
        grade: p.grade || '',
        duration: p.duration || (p.duration_weeks ? `${p.duration_weeks} weeks` : (p.start_date && p.end_date ? `${p.start_date} → ${p.end_date}` : 'N/A')),
        subjects: (() => {
          if (p.subject_order && Array.isArray(p.subject_order)) {
            const flat = p.subject_order.flat().filter(Boolean);
            return flat.length > 0 ? flat : ['N/A'];
          }
          if (Array.isArray(p.subjects) && p.subjects.length > 0) return p.subjects;
          if (p.subject_ids) return p.subject_ids.map(String);
          return ['N/A'];
        })(),
        topics: p.topics_count || p.topics || 0,
        status: p.status || 'draft',
        createdDate: p.created_at?.split('T')[0] || p.start_date || 'N/A',
        rawObject: p,
        examType: p.plan_type || p.exam_type || p.examType || 'N/A',
        startDate: p.start_date || 'N/A',
        endDate: p.end_date || 'N/A',
        studyTimeDaily: p.study_time_daily || p.min_study_time_daily || p.min_study_time || p.daily_limit_minutes || 0,
        mode: p.mode || 'PARALLEL',
        sloCount: (() => {
          if (Array.isArray(p.slo_ids)) return p.slo_ids.length;
          if (typeof p.slo_ids === 'string') {
            try { const arr = JSON.parse(p.slo_ids); if (Array.isArray(arr)) return arr.length; } catch (e) { }
            return p.slo_ids.split(',').filter(Boolean).length;
          }
          if (Array.isArray(p.slos)) return p.slos.length;
          if (typeof p.slo_count === 'number') return p.slo_count;
          if (typeof p.total_slos === 'number') return p.total_slos;

          // Aggressive fallback: find any key that might hold SLOs
          for (const key of Object.keys(p)) {
            const k = key.toLowerCase();
            if (k.includes('slo') && Array.isArray(p[key])) return p[key].length;
            if (k.includes('slo') && typeof p[key] === 'string' && p[key].includes(',')) return p[key].split(',').filter(Boolean).length;
            if ((k === 'slocount' || k === 'totalslos' || k === 'assignedslos' || k === 'slo_count') && typeof p[key] === 'number') return p[key];
          }

          return p.topics_count || p.topics || 0;
        })(),
      })) as Planner[];
    }
  });

  const planners = plannersData || [];
  const loading = isLoading;

  let fetchError = null;
  if (isError) {
    const err = error as any;
    fetchError = 'Network Error: Could not load planners.';
    if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
      fetchError = 'Request timed out. The server took too long to respond.';
    } else if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
      fetchError = 'Network Error: Cannot reach the server. Please check your connection.';
    } else if (err?.response?.status === 403) {
      fetchError = '403 Access Denied: You do not have permission to view planners.';
    } else if (err?.response?.status === 401) {
      fetchError = 'Session expired. Please log in again.';
    } else if (err?.response?.status) {
      fetchError = `Server error (${err.response.status}). Please try again.`;
    }
  }

  // Filter planners based on search
  const filteredPlanners = useMemo(() => {
    if (!searchQuery) return planners;
    const query = searchQuery.toLowerCase();
    return planners.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.subjects.some(s => s.toLowerCase().includes(query)) ||
      p.examType.toLowerCase().includes(query)
    );
  }, [searchQuery, planners]);

  // Pagination
  const totalPages = Math.ceil(filteredPlanners.length / itemsPerPage);
  const paginatedPlanners = filteredPlanners.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get base path for routing
  const getBasePath = useCallback(() => {
    if (isSuperAdmin || user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return '/admin/planners';
    if (user?.role === 'SCHOOL_ADMIN' || user?.role === 'CAMPUS_ADMIN' || ((user?.role as string) === 'ADMIN' && tenant?.campusId)) {
      return `/campus/${tenant?.campusId || localStorage.getItem('campus_id')}/planners`;
    }
    if (user?.role === 'SCHOOL') return '/school/planners';
    return '/planners';
  }, [isSuperAdmin, user?.role, tenant?.campusId]);

  // ─── Delete Mutation ──────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (planId: number) => {
      await studyPlanService.deletePlan(planId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planners'] });
      toast.success('Planner deleted successfully! 🗑️');
      setDeletingPlanner(null);
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      let serverMsg = 'Failed to delete planner.';
      if (data) {
        let rawMsg = typeof data === 'string' ? data : (data.detail || data.message || (data.non_field_errors ? String(data.non_field_errors) : ''));
        if (typeof rawMsg === 'string' && rawMsg.includes('ErrorDetail(string=')) {
          const m = rawMsg.match(/ErrorDetail\(string='([^']+)'/);
          if (m && m[1]) serverMsg = m[1];
        } else if (rawMsg) {
          serverMsg = typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg);
        }
      }
      toast.error(serverMsg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, any> }) => {
      await studyPlanService.updatePlan(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planners'] });
      queryClient.invalidateQueries({ queryKey: ['planner'] }); // Invalidate detail view cache too
      toast.success('Planner updated successfully! ✅');
      setEditingPlanner(null);
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      let serverMsg = 'Failed to update planner.';
      if (data) {
        let rawMsg = typeof data === 'string' ? data : (data.detail || data.message || (data.non_field_errors ? String(data.non_field_errors) : ''));
        if (typeof rawMsg === 'string' && rawMsg.includes('ErrorDetail(string=')) {
          const m = rawMsg.match(/ErrorDetail\(string='([^']+)'/);
          if (m && m[1]) serverMsg = m[1];
        } else if (rawMsg) {
          serverMsg = typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg);
        }
      }
      toast.error(serverMsg);
    },
  });

  return (
    <DashboardLayout activePage="all-planner">
      {/* Header Section */}
      <div className="mb-6 text-left">
        <h1 className="text-2xl font-bold text-navy-900 dark:text-slate-100">Planner Management</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage all study planners across your platform</p>
      </div>

      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search Planner"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20 transition-all"
          />
        </div>
        <button
          onClick={() => navigate(`${getBasePath()}/create`)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-200 dark:shadow-none transition-all w-full sm:w-auto shrink-0"
        >
          <Plus size={16} /> Add Planner
        </button>
      </div>
      {loading ? (
        <TableSkeleton rows={6} />
      ) : fetchError ? (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl p-8 text-center">
          <div className="text-red-500 text-4xl mb-3">⚠️</div>
          <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">Failed to Load Planners</h3>
          <p className="text-sm text-red-600 dark:text-red-300 mb-4">{fetchError}</p>
          <button onClick={() => refetch()} className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors">Retry</button>
        </div>
      ) : paginatedPlanners.length === 0 ? (
        <EmptyState type="data" title="No Planners Found" description={searchQuery ? 'Try adjusting your search query.' : 'No study planners exist yet. Create one to get started.'} onAction={() => navigate(`${getBasePath()}/create`)} actionLabel="Create Planner" />
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-accent-blue to-accent-indigo text-white">
                  <th className="px-6 py-4 text-left text-sm font-semibold">Planner Name</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Grade</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Created Date</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {paginatedPlanners.map((planner, index) => (
                  <motion.tr key={planner.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => setViewingPlanner(planner)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue to-accent-indigo text-white shadow-md"><BookOpen size={18} /></div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-navy-800 dark:text-slate-100">{planner.name}</p>
                          <p className="text-xs text-slate-400">{planner.examType}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center"><div className="flex items-center justify-center gap-2"><GraduationCap size={15} className="text-accent-indigo" /><span className="text-sm text-navy-800 dark:text-slate-200">{planner.grade || '—'}</span></div></td>
                    <td className="px-6 py-4 text-center"><span className="text-sm text-slate-500 dark:text-slate-400">{planner.createdDate}</span></td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => setViewingPlanner(planner)} className="p-2 text-accent-blue hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors" title="View"><Eye size={16} /></motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => setEditingPlanner(planner)} className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors" title="Edit"><Edit size={16} /></motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => setDeletingPlanner(planner)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors" title="Delete"><Trash2 size={16} /></motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination Footer */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing <span className="font-semibold text-navy-800 dark:text-slate-200">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredPlanners.length)}-{Math.min(currentPage * itemsPerPage, filteredPlanners.length)}</span> of <span className="font-semibold text-navy-800 dark:text-slate-200">{filteredPlanners.length}</span> planners
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-navy-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft size={16} /> Previous</button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-accent-blue text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-navy-800 dark:hover:text-slate-200'}`}>{page}</button>
                ))}
              </div>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-navy-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Next <ChevronRight size={16} /></button>
            </div>
          </div>
        </motion.div>
      )}
      {/* ─── Modals ──────────────────────────────────────────── */}
      <AnimatePresence>
        {editingPlanner && (
          <EditPlannerModal
            planner={editingPlanner}
            onClose={() => setEditingPlanner(null)}
            onSave={(id, data) => updateMutation.mutate({ id, data })}
            isSaving={updateMutation.isPending}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deletingPlanner && (
          <DeletePlannerModal
            planner={deletingPlanner}
            onClose={() => setDeletingPlanner(null)}
            onConfirm={() => deleteMutation.mutate(deletingPlanner.id)}
            isDeleting={deleteMutation.isPending}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {viewingPlanner && (
          <ViewPlannerDrawer
            planner={viewingPlanner}
            onClose={() => setViewingPlanner(null)}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default AllPlanners;
