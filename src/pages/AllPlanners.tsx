import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import api from '../api/services/api';
import { Plus, Search, Eye, Edit, Copy, Trash2, Calendar, BookOpen, GraduationCap, ChevronLeft, ChevronRight, Clock, Layers } from 'lucide-react';
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
  minStudyTime?: number;
  maxStudyTime?: number;
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

const AllPlanners: React.FC = () => {
  const navigate = useNavigate();
  const { user, tenant, isSuperAdmin } = useAuth();
  const [planners, setPlanners] = useState<Planner[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Fetch planners from backend API - NO dummy/mock data
  const fetchPlanners = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      
      const url = '/api/study-plans';
      
      console.log(`[AllPlanners] Fetching: ${url}`);
      
      const r = await api.get(url, { timeout: 10000 });
      const d = r.data;
      
      console.log('[AllPlanners] Raw API response:', JSON.stringify(d).substring(0, 500));
      
      // Extract array from any possible backend structure
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
      
      console.log(`[AllPlanners] Extracted ${rawList.length} plans from response`);
      
      // Log what fields backend actually returns so we can verify mapping
      if (rawList.length > 0) {
        console.log('[AllPlanners] First plan raw fields:', Object.keys(rawList[0]));
        console.log('[AllPlanners] First plan sample:', {
          grade: rawList[0].grade,
          slo_ids: rawList[0].slo_ids,
          min_study_time: rawList[0].min_study_time_daily,
          max_study_time: rawList[0].max_study_time_daily,
          plan_type: rawList[0].plan_type,
          title: rawList[0].title,
          subject_order: rawList[0].subject_order,
        });
      }

      // Map REAL backend fields discovered from live API response
      // Backend keys: id, title, plan_type, start_date, end_date, min_study_time_daily, created_at
      setPlanners(rawList.map((p: any) => ({
        id: p.id,
        name: p.title || p.plan_name || p.planner_name || p.name || 'N/A',
        grade: p.grade || '',
        duration: p.duration || (p.duration_weeks ? `${p.duration_weeks} weeks` : (p.start_date && p.end_date ? `${p.start_date} → ${p.end_date}` : 'N/A')),
        subjects: (() => {
          // Backend returns subject_order as nested array like [["Physics"],["DSA"]]
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
        examType: p.plan_type || p.exam_type || p.examType || 'N/A',
        startDate: p.start_date || 'N/A',
        endDate: p.end_date || 'N/A',
        dailyLimit: (p.min_study_time_daily || p.daily_limit_minutes || p.daily_limit || '').toString(),
        minStudyTime: p.min_study_time_daily || p.daily_limit_minutes || 0,
        maxStudyTime: p.max_study_time_daily || 0,
        sloCount: (() => {
          if (Array.isArray(p.slo_ids)) return p.slo_ids.length;
          if (Array.isArray(p.slos)) return p.slos.length;
          if (typeof p.slo_count === 'number') return p.slo_count;
          return p.topics_count || p.topics || 0;
        })(),
      })));
    } catch (err: any) {
      console.error('[AllPlanners] Fetch failed:', err);
      
      let errorMsg = 'Network Error: Could not load planners.';
      if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        errorMsg = 'Request timed out. The server took too long to respond.';
      } else if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
        errorMsg = 'Network Error: Cannot reach the server. Please check your connection.';
      } else if (err?.response?.status === 403) {
        errorMsg = '403 Access Denied: You do not have permission to view planners.';
        console.error(`[AllPlanners] 403 on GET /api/study-plans. Details:`, err?.response?.data);
      } else if (err?.response?.status === 401) {
        errorMsg = 'Session expired. Please log in again.';
      } else if (err?.response?.status) {
        errorMsg = `Server error (${err.response.status}). Please try again.`;
      }
      
      setFetchError(errorMsg);
      setPlanners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlanners();
  }, [fetchPlanners]);

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

  // Action handlers
  const handleView = (id: number) => navigate(`${getBasePath()}/${id}`);
  const handleEdit = (id: number) => navigate(`${getBasePath()}/${id}/edit`);
  const handleClone = async (id: number) => {
    const planner = planners.find(p => p.id === id);
    if (planner) {
      try {
        // Clone via API (if supported) or show message
        toast.success(`Cloning feature requires backend support for: ${planner.name}`);
      } catch {
        toast.error('Failed to clone planner');
      }
    }
  };
  
  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this planner?')) {
      try {
        await api.delete(`/api/study-plans/${id}`);
        setPlanners(planners.filter(p => p.id !== id));
        toast.success('Planner deleted successfully');
      } catch {
        toast.error('Failed to delete planner');
      }
    }
  };

  return (
    <DashboardLayout activePage="all-planner">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900">Planner Management</h1>
        <p className="text-sm text-slate-500 mt-1">Manage all study planners across your platform</p>
      </div>

      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search Planner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20 transition-all"
          />
        </div>
        <Button
          onClick={() => navigate(`${getBasePath()}/create`)}
          leftIcon={<Plus size={18} />}
          size="md"
        >
          Create New Planner
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <TableSkeleton rows={6} />
      ) : fetchError ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <div className="text-red-500 text-4xl mb-3">⚠️</div>
          <h3 className="text-lg font-bold text-red-700 mb-2">Failed to Load Planners</h3>
          <p className="text-sm text-red-600 mb-4">{fetchError}</p>
          <button
            onClick={() => fetchPlanners()}
            className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : paginatedPlanners.length === 0 ? (
        <EmptyState
          type="data"
          title="No Planners Found"
          description={searchQuery ? 'Try adjusting your search query.' : 'No study planners exist yet. Create one to get started.'}
          onAction={() => navigate(`${getBasePath()}/create`)}
          actionLabel="Create Planner"
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card overflow-hidden"
        >
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-accent-blue to-accent-indigo text-white">
                  <th className="px-6 py-4 text-left text-sm font-semibold">Planner Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Grade</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Duration</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Subjects</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Plan Info</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Created Date</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedPlanners.map((planner, index) => (
                  <motion.tr
                    key={planner.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group hover:bg-slate-50/80 transition-colors"
                  >
                    {(() => { console.log('Single Plan Card Data:', planner); return null; })()}
                    {/* Planner Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue/20 to-accent-indigo/20 text-accent-blue">
                          <BookOpen size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-navy-800 group-hover:text-accent-blue transition-colors">
                            {planner.name}
                          </p>
                          <p className="text-xs text-slate-400">{planner.examType}</p>
                        </div>
                      </div>
                    </td>

                    {/* Grade */}
                    <td className="px-6 py-4">
                      {planner.grade ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
                          Grade {planner.grade}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    {/* Duration */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar size={14} className="text-slate-400" />
                        <span>{planner.duration}</span>
                      </div>
                    </td>

                    {/* Subjects */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <GraduationCap size={14} className="text-slate-400" />
                        <span className="text-sm text-slate-600">{planner.subjects.join(', ')}</span>
                      </div>
                    </td>

                    {/* Plan Info: SLOs + Study Time */}
                    <td className="px-6 py-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Layers size={13} className="text-accent-blue" />
                          <span>{planner.sloCount || 0} SLO{planner.sloCount !== 1 ? 's' : ''}</span>
                        </div>
                        {(planner.minStudyTime || planner.maxStudyTime) ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Clock size={13} className="text-emerald-500" />
                            <span>{planner.minStudyTime || 0}m - {planner.maxStudyTime || 0}m daily</span>
                          </div>
                        ) : null}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <StatusBadge status={planner.status} />
                    </td>

                    {/* Created Date */}
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-500">{planner.createdDate}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleView(planner.id)}
                          className="p-2 text-cyan-500 hover:bg-cyan-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleEdit(planner.id)}
                          className="p-2 text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleClone(planner.id)}
                          className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Clone"
                        >
                          <Copy size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDelete(planner.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing <span className="font-semibold text-navy-800">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredPlanners.length)}-{Math.min(currentPage * itemsPerPage, filteredPlanners.length)}</span> of <span className="font-semibold text-navy-800">{filteredPlanners.length}</span> planners
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-navy-800 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-accent-blue text-white'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-navy-800'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-navy-800 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </DashboardLayout>
  );
};

export default AllPlanners;
