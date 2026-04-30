import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import Button from '../components/Button';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import api from '../api/services/api';
import { Plus, Search, Eye, Edit, Copy, Trash2, Calendar, BookOpen, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

// Planner Type Definition
interface Planner {
  id: number;
  name: string;
  duration: string;
  subjects: string[];
  topics: number;
  status: 'active' | 'draft' | 'completed';
  createdDate: string;
  examType: string;
  startDate?: string;
  endDate?: string;
  dailyLimit?: string;
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
  const [planners, setPlanners] = useState<Planner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Fetch planners from backend API
  const fetchPlanners = useCallback(async () => {
    try {
      setLoading(true);
      const r = await api.get('/api/study-plans');
      const d = r.data;
      
      // Transform backend data to match Planner interface
      const fetchedPlanners: Planner[] = Array.isArray(d) ? d : d?.results ?? d?.data ?? [];
      
      setPlanners(fetchedPlanners.map((p: any) => ({
        id: p.id,
        name: p.plan_name || p.name,
        duration: p.duration || `${p.duration_weeks || 12} weeks`,
        subjects: p.subjects || ['General'],
        topics: p.topics_count || p.topics || 0,
        status: p.status || 'active',
        createdDate: p.created_at?.split('T')[0] || p.createdDate || new Date().toISOString().split('T')[0],
        examType: p.exam_type || p.examType || 'General',
        startDate: p.start_date,
        endDate: p.end_date,
        dailyLimit: p.daily_limit_minutes?.toString(),
      })));
    } catch {
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

  // Action handlers
  const handleView = (id: number) => navigate(`/planners/${id}`);
  const handleEdit = (id: number) => navigate(`/planners/${id}/edit`);
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
          onClick={() => navigate('/planners/create')}
          leftIcon={<Plus size={18} />}
          size="md"
        >
          Create New Planner
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <TableSkeleton rows={6} />
      ) : paginatedPlanners.length === 0 ? (
        <EmptyState
          type="data"
          title="No Planners Found"
          description={searchQuery ? 'Try adjusting your search query.' : 'Create your first study planner to get started.'}
          onAction={() => navigate('/planners/create')}
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
                  <th className="px-6 py-4 text-left text-sm font-semibold">Duration</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Subjects</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Topics</th>
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

                    {/* Topics */}
                    <td className="px-6 py-4 text-center">
                      <TopicsBadge count={planner.topics} />
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
